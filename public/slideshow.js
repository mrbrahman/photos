var photos = photos || {};


photos.slideshow = function(){

  var fadein=1, fadeout=1, duration=3, legend=true, i=0, loop=false, autoPlay=true, startFrom;
  var slideshowDiv, slideshowTimer, screenWidth, screenHeight, newScreenWidth, newScreenHeight,
    state = {};
  
  function my(selection, slideshowItems){
    screenWidth=document.documentElement.clientWidth;
    screenHeight=document.documentElement.clientHeight;

    newScreenWidth=screenWidth; newScreenHeight=screenHeight;

    document.addEventListener("keydown", function(event) {
      console.log(event.keyCode);
    });

    window.addEventListener("resize", function(){
      newScreenWidth=document.documentElement.clientWidth;
      newScreenHeight=document.documentElement.clientHeight;

    });

    state.slideshowItems = slideshowItems;
    state.totalContent = slideshowItems.length-1;
    state.contentPointer = startFrom-1 || -1;
    state.paused = false;
    
    selection.each(function(){

      slideshowDiv = d3.select(this);

      showContent();

    });
  
  }

  function showContent() {
    
    // advance pointer
    state.contentPointer = (state.contentPointer+1 > state.totalContent) ? 
      (loop ? 0 : undefined) : 
      ++state.contentPointer;
    
    if(!isNaN(state.contentPointer)){
      // check for window resize
      if(screenWidth!=newScreenWidth || screenHeight!=newScreenHeight){
        screenWidth=newScreenWidth;
        screenHeight=newScreenHeight;
      }
      showImage(state.slideshowItems[state.contentPointer]);

      if(autoPlay && !state.paused){
        slideshowTimer = setTimeout(showContent, duration*1000);
      }
    } else {
      console.log("no more content...");
    }
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

    slideshowDiv.selectAll("*")
      .transition(d3.transition().duration(fadeout*1000))
        .style("opacity", 0)
      .remove();

    var imageDiv = slideshowDiv.append("div")
      .attr("style", `position: absolute; top: ${topPixels}px; left: ${leftPixels}px`)
    ;

    var img = imageDiv.append("img")
      .attr("class", "slideshow-image")
      .attr("src", `getImage?album=${image.album}&file=${image.file}&width=${screenWidth}&height=${screenHeight}`)
      .attr("width", imageWidth)
      .attr("height", imageHeight)
      .style("opacity", 0)
      .transition(d3.transition().duration(fadein*1000))
        .style("opacity", 1)
    ;

    if(legend){
      slideshowDiv.append("div")
        .attr("style", "position: absolute; top:10px; left:10px")
        .append("p")
          .attr("style", "font: 14px arial, sans-serif; color: White;")
          .html(image.file)
          .style("opacity", 0)
          .transition(d3.transition().duration(fadein*1000))
            .style("opacity", 1)
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
    return arguments.length ? (startFrom =_, my) : startFrom;
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
      state.paused = true;
      
      console.log("paused");
    }
  }

  my.resume = function(){
    if(state.paused){
      --state.contentPointer;
      state.paused=false;
      showContent();
    }
  }

  my.restart = function(){
    state.contentPointer = -1;
    showContent();
  }

  my.next = function(){
    if(slideshowTimer){
      clearTimeout(slideshowTimer);
    }
    // contentPointer is incremented in showContent
    showContent();
  }

  my.previous = function(){
    if(slideshowTimer){
      clearTimeout(slideshowTimer);
    }
    
    // rewind by 2 slots
    if(state.contentPointer==1){
      if(loop){
        state.contentPointer=state.totalContent;
      } else {
        state.contentPointer=undefined;
      }
      
    } else if (state.contentPointer==0){
      if(loop){
        state.contentPointer=state.totalContent-1;
      } else {
        state.contentPointer=undefined;
      }
    } else {
      state.contentPointer=state.contentPointer-2; 
    }
    
    showContent();
  }

  my.currentPosition = function(){
    return state.contentPointer;
  }

  return my;

}
