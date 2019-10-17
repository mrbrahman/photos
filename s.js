const dir = require('node-dir');
const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database('meta.db', {  }); //verbose: console.log
const exiftool = require("exiftool-vendored").exiftool;
const ffmpeg = require('fluent-ffmpeg');

const util = require('util');

// Only for first time use: Create table if not present

log("Starting");

var stmt = db.prepare(`
  create virtual table if not exists meta using fts5(
    album, filename, folder, filesize, ext, mimetype, keywords, faces, rating, imagesize, aspectratio,
    make, model, orientation, datetimeoriginal, createdate, filemodifydate, filedate); 
`);

var info = stmt.run();

//console.log(util.inspect(info));

let albums= {
  TEST: "/home/shreyas/Projects/test_images/images/",
  PHOTOS_TEST: "/media/windows/PHOTOS/2019/",
  PHOTOS: "/media/windows/PHOTOS/",
  2018: "/media/windows/PHOTOS/2018/",
  2017: "/media/windows/PHOTOS/2017/",
  2016: "/media/windows/PHOTOS/2016/",
  2015: "/media/windows/PHOTOS/2015/",
  2014: "/media/windows/PHOTOS/2014/",
  2013: "/media/windows/PHOTOS/2013/",
  2012: "/media/windows/PHOTOS/2012/",
  2011: "/media/windows/PHOTOS/2011/"
}

const album = "PHOTOS";

function getFilesMtime(files){
  return new Promise((resolve,reject)=>{
    try {
      let stats = {};
      files.forEach(f=>{
        stats[f.replace(albums[album],"")] = fs.statSync(f).mtime.getTime()/1000; // in Unix Epoch
      });
      resolve(stats);
    } catch(err){  // TODO: Doesn't seem to work
      reject(err);
      return;
    }
  })
}

var filesPromise = dir.promiseFiles(albums[album])
  .then(getFilesMtime);


var stmt = db.prepare("select filename, filemodifydate from meta where album = ?");

function getMetadata(album){
  return new Promise((resolve,reject)=>{
    let sqlOutput = stmt.all(album);
    let meta= {};
    sqlOutput.forEach(d=>{
      meta[d.filename] = d.filemodifydate;
    })
    resolve(meta);
  })
}

var metaPromise = getMetadata(album);

const deleteStmt = db.prepare("delete from meta where album = @album and filename = @filename");

const deleteMany = db.transaction((records)=>{
  for (const r of records) deleteStmt.run(r) 
});

const insertStmt = db.prepare("insert into meta ( \
  album, filename, folder, filesize, ext, mimetype, keywords, faces, rating, imagesize, aspectratio, \
  make, model, orientation, datetimeoriginal, createdate, filemodifydate, filedate \
) \
values ( \
  @album, @filename, @folder, @filesize, @ext, @mimetype, @keywords, @faces, @rating, @imagesize, @aspectratio, \
  @make, @model, @orientation, @datetimeoriginal, @createdate, @filemodifydate, @filedate \
)");

const insertMany = db.transaction((records)=>{
  for (const r of records) {
    try{
      insertStmt.run(r);
    } catch(err) {
      log(util.inspect(r));
      log(err);
      throw(err);
    }
  }
});

const rotationMapping = {
  0: 1,
  90: 6,
  180: 3,
  270: 8
};

function extractVideoThumbnail(videoTags){

  var tags=videoTags;

  return new Promise((resolve,reject)=>{
    let sourceFileName = tags.Directory+'/'+tags.FileName,
      videoThumbnailFileName = album.concat('/', tags.Directory.replace(albums[album], ""), '/', tags.FileName, '.jpg').replace(/\//gi, '_');

    // extract thumbnail
    ffmpeg(sourceFileName)
      .on("error", function(error){
        console.log(error)
      })
      .on("start", function(cmd){
       console.log("Running: "+cmd)
      })
      .thumbnail({
        count: 1,
        folder: '.video-thumbnails',
        filename: videoThumbnailFileName,
        size: tags.ImageSize||"1040x640"
      })
      .on("end", async function(){
        console.log("writing tags...");

        try{
          var writeTag = await exiftool.write('.video-thumbnails/'+videoThumbnailFileName, {
            "Orientation#": rotationMapping[tags.Rotation]
          });
          resolve('.video-thumbnails/'+videoThumbnailFileName);
        } catch(err) {
          console.log("EXIFTOOL ERROR during Orientation "+ err)
          reject(err);
        }
      });
  });
}

async function run(){
  var values = await Promise.all([filesPromise, metaPromise]);

// Promise.all([filesPromise, metaPromise])
// .then(function(values){
  let fs=values[0], meta=values[1], delta=[], removed=[];
  log("fs "+Object.keys(fs).length + " meta "+Object.keys(meta).length);
  
  Object.keys(fs).forEach(f=>{
    if(fs[f] > (meta[f]||0)){
      delta.push(albums[album]+f); // put the dir back, need full path for exiftool
    }
  });
  
  Object.keys(meta).forEach(f=>{
    if(!fs[f]){
      removed.push(f);  // just the filename to be deleted
    }
  });
  
  log("delta "+delta.length + " removed "+ removed.length);
  //console.log(delta);
  //console.log(removed);

  try{

    // Remove records withoug files anymore
    deleteMany(removed.map(r=>{
      return {
        album: album,
        filename: r
      }
    }))


    log("Starting Promises to extract metadata using exiftool");
    
    var exifPromises = [];

    delta.map(file=>{
      var p = exiftool.read(file);
      exifPromises.push(p);
    });

    var exifMetaData = await Promise.all(exifPromises);
//     .then(exifMetaData=>{

    log("All Promises Completed; Starting DELETE");

    // first delete the record (if any)
    deleteMany(exifMetaData.map(tags=>{
      return { 
        album: album,
        filename: tags.Directory.replace(albums[album], "")+"/"+tags.FileName
      }
    }));

    // extract video thumbnails
    let videosExif = exifMetaData.filter(tags=>{
      //log(util.inspect(tags));
      let mimetype = tags["MIMEType"]||"x"
      return mimetype.startsWith("video")
    });

    log("# of Videos: "+videosExif.length);

    var videoThumbPromises = [];
    videosExif.forEach(video=>{
      videoThumbPromises.push( extractVideoThumbnail(video) );
    });

    log("Starting extraction of video Thumbnails");

    await Promise.all(videoThumbPromises);

    log("Starting INSERT");

    // now, insert the new metadata
    insertMany(exifMetaData.map(tags=>{

      let imageSize = tags.ImageSize ? tags.ImageSize.split(/x/i) : "";

      // TODO: Different for video needed here
      let
        aspectRatio = imageSize ? 
          tags.Orientation ? 
            ([6,8].indexOf(tags.Orientation) >= 0) ? imageSize[1]/imageSize[0] : imageSize[0]/imageSize[1] 
          : imageSize[0]/imageSize[1] 
        : 0;

      return {
        album: album,
        filename: tags.Directory.replace(albums[album], "")+"/"+tags.FileName,
        folder: tags.Directory.replace(albums[album], ""),
        filesize: tags.FileSize||null,
        ext: tags.FileName.split(".").pop().toLowerCase(),
        mimetype: tags.MIMEType||null,
        keywords: tags.Keywords ? ((typeof(tags.Keywords) == "string") ?  tags.Keywords : tags.Keywords.join(", ")) : null,
        faces: tags.RegionInfo ? tags.RegionInfo.RegionList.map(d=>d.Name).join(", ") : null,
        rating: tags.Rating||null,
        imagesize: tags.ImageSize||null,
        aspectratio: aspectRatio,
        make: tags.Make||null,
        model: tags.Model||null,
        orientation: tags.Orientation||null,
        datetimeoriginal: tags.DateTimeOriginal ? tags.DateTimeOriginal.toString() : null,
        createdate: tags.CreateDate ? tags.CreateDate.toString() : null,
        filemodifydate: tags.FileModifyDate ? tags.FileModifyDate.toString() : null,
        filedate: tags.DateTimeOriginal ? tags.DateTimeOriginal.toString() : (tags.CreateDate ? tags.CreateDate.toString() : (tags.FileModifyDate.toString() ))
      }
    }));

//     })
//     .catch(err=>{
//       log(`PROMISE ERROR ${err}`);
//      })
//     .finally(()=>{
//       exiftool.end();
//       log("In FINALLY block");

//      });
  } catch(err){
    console.error("ERROR: ", err)
  } finally {
    log("In FINALLY block");
    exiftool.end();
  }
  
}

function log(str){
  var d = new Date(); 
  console.log(`${d.getHours()}:${d.getMinutes()}:${d.getSeconds()} --> ${str}`);
}

run();
