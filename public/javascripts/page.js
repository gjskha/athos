document.addEventListener('DOMContentLoaded', function() {

  const blockid =  document.getElementById("blockid").textContent;
  
  editLink = document.getElementById("edit");
  editLink.addEventListener("click", function(){
    //alert("edit");
  });
 
  histLink = document.getElementById("history");
  histLink.addEventListener("click", function(){
    
    axios.get('http://localhost:3000/internal/blocks/'+blockid+'/revisions').then((response) => {
    const resultLength = response.data.result.length; alert(resultLength);
    alert(response.data.result[0].REVISIONID);
    for(let i = 0; i < resultLength; i++) {


    }
    console.log(response.data);
    //console.log(response.status);
    //console.log(response.statusText);
    //console.log(response.headers);
    //console.log(response.config);

    let body = document.getElementsByTagName("BODY")[0];

    let markButton = document.createElement("BUTTON");
    markButton.id = "markButton";
    let markText = document.createTextNode("Mark Cell");
    markButton.appendChild(markText);
    body.appendChild(markButton);

}, (error) => {
  // alert(error);
});
  });


  catLink = document.getElementById("categories");
  catLink.addEventListener("click", function(){
    //alert("categories");


  });

});
