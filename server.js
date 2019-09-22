const util = require('util');

const express = require('express');
const app = express();

const fs = require('fs');

process.env.UV_THREADPOOL_SIZE = 1;
const sharp = require('sharp');
sharp.concurrency(1);
sharp.cache(0);


//const resize = require('./resize');

const Database = require('better-sqlite3');
const db = new Database('meta.db', {  }); //verbose: console.log

let albums= {
  TEST: "/home/shreyas/Projects/test_images/images",
  PHOTOS: "/media/windows/PHOTOS"
}

function resize(path, width, height, format) {

//export default function(path, width, height, format){
  const readStream = fs.createReadStream(path);
  let transform = sharp(null, { failOnError: false })
    .rotate()
    .resize({
      width: width, 
      height: height,
      fit: "inside",
      withoutEnlargement: true
    });
  
  return readStream.pipe(transform);
}


app.get('/getThumbnail', function(req, res){
  let {album, filename, width, height, mimetype} = req.query;

//   switch(mimetype.split("/")[0]){
//     case "image":
      width = +width || undefined;
      height = +height || undefined;
      
      resize(albums[album]+"/"+filename, width, height).pipe(res);
//       break;

//     case "video":
//       console.log("TBD video");
//       break;

//     case "audio":
//       console.log("TBD audio")
//   }

});

app.get('/getImage', (req, res) => {

  let {album, filename, width, height, format} = req.query;
  width = +width || undefined;
  height = +height || undefined;
  
  res.type(`image/${format || 'jpg'}`);
  res.set({
    "Content-Disposition": `inline;filename="${filename.split(/\//).pop()}"`
  });
  
  resize(albums[album]+"/"+filename, width, height).pipe(res);
});

app.get('/getFile', (req, res) => {
  let {album, filename} = req.query;
  res.set({
    "Content-Disposition": `inline;filename="${filename.split(/\//).pop()}"`
  });

  res.sendFile(albums[album]+"/"+filename);
});

app.get(/\/last(\d+)/, function(req, res){
  let count = req.params[0];

  let stmt = db.prepare(`
  select album, filename, mimetype, aspectratio as aspectRatio
  from meta
  where album = 'PHOTOS'
  order by filedate desc limit ?`);

  res.json(stmt.all(count));
});

app.get('/search', function(req, res){
  
  let cols = ["folder", "filename", "mimetype", "tags", "faces", "rating", "make", "model"];
  let nonCols = ["group", "filematch", "datefrom", "dateto"];

  let filters="", orderby="";
  for (let [k,v] of Object.entries(req.query)){
    if(cols.includes(k)){
      filters = filters + `${filters? " AND " : ""} { ${k} }: "${v}"`
    } else if(nonCols.includes(k)){
      // not filters; handle these separately
    } else {
      filters = filters + `${filters? " AND " : ""} ${k}`
    }
  }

  if (req.query.group){
    orderby = `${req.query.group} desc, filedate`;
  } else {
    orderby = `filedate desc`;
  }

  let stmt = db.prepare(`
  select album, filename, mimetype, aspectratio as aspectRatio, folder
    , date(filedate) filedate
  from meta
  where mimetype is not null and mimetype like 'image%'
  and meta match '${filters}'
  order by ${orderby}`);

  console.log(stmt);

  res.json(stmt.all());
});

app.use(express.static('public'));

app.listen(9000, ()=>{
  console.log("Server started and listening in port 9000!");
});
