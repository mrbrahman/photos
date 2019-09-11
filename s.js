const dir = require('node-dir');
const fs = require('fs');
const Database = require('better-sqlite3');
const db = new Database('meta.db', { verbose: console.log, autocommit: false });
const exiftool = require("exiftool-vendored").exiftool;

console.log("before calling exiftool");

exiftool
  .version()
  .then(version => console.log(`We're running ExifTool v${version}`))
;

exiftool
  .read('/media/windows/PHOTOS/2013/2013-06-02 Bushkill-Stroudsburg-Saylorsburg/IMG_4076.JPG')
  .then((tags /*: Tags */) => {
    let t = tags.FileModifyDate;
    let t1 = t.toDate().getTime()/1000;
    console.log(t);
    console.log(t1);
    console.log(
      `${tags.DateTimeOriginal}, Keywords: ${tags.Keywords}, Make: ${tags.Make}, Model: ${tags.Model}, Errors: ${tags.errors}`
    )
  })
  .catch(err => console.error("Something terrible happened: ", err))
  .finally(function(){
    exiftool.end();
  })
;


/*
function getFilesMtime(files){
  return new Promise((resolve,reject)=>{
    try {
      let stats = {};
      files.forEach(f=>{
        stats[f.replace("/media/windows/PHOTOS/","")] = fs.statSync(f).mtime.getTime()/1000; // in Unix Epoch
      });
      resolve(stats);
    } catch(err){  // TODO: Doesn't seem to work
      reject(err);
      return;
    }
  })
}

var filesPromise = dir.promiseFiles('/media/windows/PHOTOS/2019')
  .then(getFilesMtime);


var stmt = db.prepare("select filename, filemodifydate from metadata where album = ?");

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

var metaPromise = getMetadata('PHOTOS');

Promise.all([filesPromise, metaPromise])
.then(function(values){
  let fs=values[0], meta=values[1], delta=[], removed=[];
  console.log("fs "+Object.keys(fs).length + " meta "+Object.keys(meta).length);
  
  Object.keys(fs).forEach(f=>{
    if(fs[f] > (meta[f]||0)){
      delta.push(f);
    }
  });
  
  Object.keys(meta).forEach(f=>{
    if(!fs[f]){
      removed.push(f);
    }
  });
  
  console.log("delta "+delta.length + " removed "+ removed.length);
  console.log(removed);
  
});
*/

