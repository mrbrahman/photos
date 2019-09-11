module.exports = function (path, width, height, format) {

//export default function(path, width, height, format){
  const fs = require('fs');
  const sharp = require('sharp');
  
  const readStream = fs.createReadStream(path);
  let transform = sharp()
    .rotate()
    .resize({
      width: width, 
      height: height,
      fit: "inside",
      withoutEnlargement: true
    });
  
  return readStream.pipe(transform);
}
