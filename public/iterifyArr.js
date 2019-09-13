var iterifyArr = function (arr, startFrom, loop) {
  var cur = startFrom-1 || -1;
  
  arr.next = function() {
    return (cur+1 >= arr.length) ? 
      (loop ? (cur=0, this[cur]) : null) : 
      this[++cur];
  };

  arr.prev = function() { 
    return (cur-1 < 0) ? 
      (loop? (cur=arr.length-1, this[cur]) : null) : 
      this[--cur]; 
  };
  
  arr.cur = function() {return cur};
  
  return arr;
};