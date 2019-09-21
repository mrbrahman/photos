const dir = require('node-dir');
const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database('meta.db', {  }); //verbose: console.log
const exiftool = require("exiftool-vendored").exiftool;

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

const album = "TEST";

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

Promise.all([filesPromise, metaPromise])
.then(function(values){
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


    log("Starting Promises");
    
    var exifPromises = [];

    delta.map(file=>{
      var p = exiftool.read(file);
      exifPromises.push(p);
    });

    Promise.all(exifPromises)
    .then(promiseReturns=>{

      log("All Promises Completed; Starting DELETE");

      // first delete the record (if any)
      deleteMany(promiseReturns.map(tags=>{
        return { 
          album: album,
          filename: tags.Directory.replace(albums[album], "")+"/"+tags.FileName
        }
      }));

      log("Starting INSERT");

      // now, insert the new metadata
      insertMany(promiseReturns.map(tags=>{

        let imageSize = tags.ImageSize ? tags.ImageSize.split(/x/i) : "", 
          aspectRatio = imageSize ? 
            tags.orientation ? 
              [6,8].indexOf(tags.orientation) ? imageSize[1]/imageSize[0] : imageSize[0]/imageSize[1] 
            : imageSize[0]/imageSize[1] 
          : 0;

        return {
          album: album,
          filename: tags.Directory.replace(albums[album], "")+"/"+tags.FileName,
          folder: tags.Directory.replace(albums[album], ""),
          filesize: tags.FileSize||null,
          ext: tags.FileName.split(".").pop(),
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

    })
    .catch(err=>{
      log("PROMISE ERROR ${err}");
     })
    .finally(()=>{
      exiftool.end();
      log("In FINALLY block");

     });
  } catch(err){
    console.error("ERROR: ", err)
  }
  
});

function log(str){
  var d = new Date(); 
  console.log(`${d.getHours()}:${d.getMinutes()}:${d.getSeconds()} --> ${str}`);
}
