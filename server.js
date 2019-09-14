const express = require('express');
const app = express();

const resize = require('./resize');
//import resize from "./resize";

let albums= {
  TEST: "/home/shreyas/Projects/test_images/images",
  PHOTOS: "/media/windows/PHOTOS"
}

app.get('/getImage', (req, res) => {

  let {album, file, width, height, format} = req.query;
  width = +width || undefined;
  height = +height || undefined;
  
  res.type(`image/${format || 'jpg'}`);
  res.set({
    "Content-Disposition": `inline;filename="${file.split(/\//).pop()}"`
  })
  resize(albums[album]+"/"+file, width, height).pipe(res);
});

app.get('/getFile', (req, res) => {
  let {album, file} = req.query;

  res.sendFile(albums[album]+"/"+file);
})

app.use(express.static('public'));

app.listen(9000, ()=>{
  console.log("Server started and listening in port 9000!");
});
