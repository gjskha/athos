document.addEventListener('DOMContentLoaded', function() {

  const blockid =  document.getElementById("blockid").textContent;
  
  editLink = document.getElementById("edit");
  editLink.addEventListener("click", function(){
    makeActive("edit");


  });
 
  histLink = document.getElementById("history");
  histLink.addEventListener("click", function(){
    
    makeActive("history");

    axios.get('http://localhost:3000/internal/blocks/'+blockid+'/revisions').then((response) => {
    const resultLength = response.data.result.length; 

    let table = document.createElement("TABLE");

    // create a table with the revisions
    for (let i = 0; i < resultLength; i++) {
      let revisionId = response.data.result[i].REVISIONID;
      let revisionUser = response.data.result[i].USERNAME;
      let revisionCreated = response.data.result[i].CREATED;

      let row = document.createElement("TR");    
      row.id = "row" + revisionId;

      let rId = document.createElement("TD");    
      let rIdTxt = document.createTextNode(revisionId);
      rId.appendChild(rIdTxt);
      row.appendChild(rId);

      let rUser = document.createElement("TD");    
      let rUserTxt = document.createTextNode(revisionUser);
      rUser.appendChild(rUserTxt);
      row.appendChild(rUser);

      let rCreated = document.createElement("TD");    
      let rCreatedTxt = document.createTextNode(revisionCreated);
      rCreated.appendChild(rCreatedTxt);
      row.appendChild(rCreated);

      let checkBoxTr = document.createElement("TD");    
      let checkBox = document.createElement("INPUT");
      checkBox.id = "cb" + revisionId;
      checkBox.type = "checkbox";
      checkBoxTr.appendChild(checkBox);
      let label = document.createElement('label')
      label.htmlFor = checkBox;

      row.appendChild(checkBoxTr);
      table.appendChild(row);
    }
    //console.log(response.data);
    //console.log(response.status);
    //console.log(response.statusText);
    //console.log(response.headers);
    //console.log(response.config);

    contentDiv = document.getElementById("page_data");
    while (contentDiv.firstChild) {
        contentDiv.removeChild(contentDiv.firstChild);
    }

    contentDiv.appendChild(table);
    
    let diffButton = document.createElement("BUTTON");
    diffButton.id = "diffButton";
    let diffLabel = document.createTextNode("View Diff");
    diffButton.appendChild(diffLabel);
    contentDiv.appendChild(diffButton);

    }, (error) => {
      // alert(error);
    });

  });

  catLink = document.getElementById("categories");
  catLink.addEventListener("click", function(){
    //alert("categories");

    makeActive("categories");

    axios.get('http://localhost:3000/internal/blocks/'+blockid+'/categories').then((response) => {

    const resultLength = response.data.result.length; 

    let categoryList = document.createElement("UL");

    for (let i = 0; i < resultLength; i++) {

      let categoryItem = document.createElement("LI");
      let categoryText = document.createTextNode(response.data.result[i].CATEGORYTEXT);
      categoryItem.appendChild(categoryText);
      categoryList.appendChild(categoryItem);
    }
     
    contentDiv = document.getElementById("page_data");
    while (contentDiv.firstChild) {
      contentDiv.removeChild(contentDiv.firstChild);
    }

    contentDiv.appendChild(categoryList);

    });

  });

  /* update the nav bar by setting the class to be active on the new tab and
 * removing it from the old one */
  function makeActive(activateTab) {

    const pillnav = document.getElementById("navigation");
    let children = pillnav.children;
    for (let i = 0; i < children.length; i++) {
      let navChild = children[i];
      if (navChild.classList.contains("active")) {
        navChild.classList.remove("active");
      }
    }

    const activeTab = document.getElementById(activateTab);
    activeTab.className = "active";
    
  }

});


