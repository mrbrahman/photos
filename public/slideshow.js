var photos = photos || {};


photos.slideshow = function(){

  var fadein=1, fadeout=1, duration=3, legend=true, i=0, loop=false, autoPlay=true;
  var slideshowDiv, slideshowTimer, screenWidth, screenHeight, newScreenWidth, newScreenHeight,
    totalContent, canvas, context;
  
  function my(selection, images){
    screenWidth=document.documentElement.clientWidth;
    screenHeight=document.documentElement.clientHeight;

    newScreenWidth=screenWidth; newScreenHeight=screenHeight;

    totalContent = images.length-1;

    document.addEventListener("keydown", function(event) {
      console.log(event.keyCode);
    });

    window.addEventListener("resize", function(){
      newScreenWidth=document.documentElement.clientWidth;
      newScreenHeight=document.documentElement.clientHeight;

    });

    selection.each(function(){

      slideshowDiv = d3.select(this);

      playShow();

    });
  
  }

  function playShow() {
    if(i>totalContent && loop){
      i = 0;
    }

    if(i<=totalContent){
      // check for window resize
      if(screenWidth!=newScreenWidth || screenHeight!=newScreenHeight){
        screenWidth=newScreenWidth;
        screenHeight=newScreenHeight;
      }
      showImage(images[i]);

      //showImage(images[i].album, images[i].file)
      if(autoPlay){
        slideshowTimer = setTimeout(playShow, duration*1000);
      }
    } else {
      console.log("no more images...");
    }
    i++;
  }

  
  function showImage(image) {

    var imageWidth=0, imageHeight=0, topPixels=0, leftPixels=0;

    {
      let tmpWidth, tmpHeight;
      // assume image will occupy full width
      tmpWidth = screenWidth;
      tmpHeight = Math.floor(screenWidth/image.aspectRatio);

      if(tmpHeight <= screenHeight){
        imageWidth = screenWidth;
        imageHeight = tmpHeight;

        leftPixels = 0;
        topPixels = Math.floor((screenHeight-imageHeight)/2);

        imageWidth=tmpWidth; imageHeight=tmpHeight;
      } else {
        imageHeight = screenHeight;
        imageWidth = screenHeight*image.aspectRatio;

        topPixels = 0;
        leftPixels = (screenWidth-imageWidth)/2;
      }

    }

    slideshowDiv.selectAll("*").remove();

    var imageDiv = slideshowDiv.append("div")
      .attr("style", `position: absolute; top: ${topPixels}px; left: ${leftPixels}px`)
    ;

    var img = imageDiv.append("img")
      .attr("class", "slideshow-image")
      .attr("src", `getImage?album=${image.album}&file=${image.file}&width=${screenWidth}&height=${screenHeight}`)
      .attr("width", imageWidth)
      .attr("height", imageHeight)
    ;

    if(legend){
      slideshowDiv.append("p")
        .attr("style", "font: 15px arial, sans-serif; color: White;")
        .html(image.file)
    }


//     d3.image(`getImage?album=${album}&file=${file}&width=${screenWidth}&height=${screenHeight}`)
//     .then(function(image){
//       //console.log(image.width + " " + image.height);
      
//       context.clearRect(0, 0, screenWidth, screenHeight);
//       context.drawImage(image, (screenWidth-image.width)/2 , (screenHeight-image.height)/2);

//       if(legend){
//         context.fillStyle = "white";
//         context.font = "1em Arial"
//         context.fillText(file, 5, 25);
//       }
//     });
  }

    
  // params

  my.fadein = function(_){
    return arguments.length ? (fadein = +_, my) : fadein; 
  }
  
  my.fadeout = function(_){
    return arguments.length ? (fadeout = +_, my) : fadeout; 
  }
  
  my.duration = function(_){
    return arguments.length ? (duration = +_, my) : duration;
  }

  my.legend = function(_){
    return arguments.length ? (legend = _, my) : legend;
  }

  my.startFrom = function(_){
    return arguments.length ? (i =_, my) : (i > images.length ? 0 : i);
  }

  my.loop = function(_){
    return arguments.length ? (loop = _, my): loop;
  }

  my.autoPlay = function(_){
    return arguments.length ? (autoPlay = _, my) : autoPlay;
  }

  // actions and statuses
  my.pause = function(){
    if(slideshowTimer){
      console.log("pausing .. "+slideshowTimer);
      clearTimeout(slideshowTimer);
      console.log("paused");
    }
  }

  my.resume = function(){
    i--; playShow();
  }

  my.restart = function(){
    i = 0;
    playShow();
  }

  my.next = function(){
    if(slideshowTimer){
      clearTimeout(slideshowTimer);
    }
    // i is already incremented
    playShow();
  }

  my.previous = function(){
    if(slideshowTimer){
      clearTimeout(slideshowTimer);
    }
    i=i-2; // rewind by 2 slots
    playShow();
  }

  my.currentPosition = function(){
    return i-1;
  }

  return my;

}
