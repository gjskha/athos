/* Functionality for the nav bar for page content */
document.addEventListener('DOMContentLoaded', function() {

  /* common variables to all tabs */
  const hosturl = 'http://localhost:3000';
  /* TBD hash these */
  const blockid = document.getElementById("blockid").textContent;
  const revisionid = document.getElementById("revisionid").textContent;
  //const userid = document.getElementById("userid").textContent;

  /* Create a form for editing a page */
  editLink = document.getElementById("edit");
  editLink.addEventListener("click", function(){
    makeActive("edit");

    axios.get(hosturl+'/internal/blocks/'+blockid+'/revisions/'+revisionid).then((response) => {

      let form = document.createElement("FORM");
      form.id = "editPage";

      /* body */
      let textArea = document.createElement("TEXTAREA");
      textArea.id = "editText";
      textArea.cols = 50;
      textArea.rows = 150;
      textArea.value = response.data.result[0].TEXT;

      let taLabel = document.createTextNode("Edit Category");
      textArea.appendChild(taLabel);
      form.appendChild(textArea);

      let br = document.createElement("BR");
      form.appendChild(br);

      /* submit button */
      let submitButton = document.createElement("BUTTON");
      submitButton.id = "submitEdit";
      let submitLabel = document.createTextNode("Submit");
      submitButton.appendChild(submitLabel);
      form.appendChild(submitButton);
 
      swapChildNodes(form);
  
      submitButton.addEventListener("click", function(){
        //alert("edited");
        let edits = textArea.value;
        alert(edits); 
        axios.post(hosturl+'/internal/revisions','block_id='+blockid+'&revision_text='+edits).then((response) => {

           console.log(response.status);
           console.log(response.config);
        });

      });

    });
  });
 
  /* History of the page */
  histLink = document.getElementById("history");
  histLink.addEventListener("click", function(){
    
    makeActive("history");

    axios.get(hosturl+'/internal/blocks/'+blockid+'/revisions').then((response) => {
    const resultLength = response.data.result.length; 

    let table = document.createElement("TABLE");

    let th = document.createElement("TR");

    let rId = document.createElement("TD");
    let rIdTxt = document.createTextNode("ID");
    rId.appendChild(rIdTxt);
    th.appendChild(rId);

    let rUser = document.createElement("TD");    
    let rUserTxt = document.createTextNode("User");
    rUser.appendChild(rUserTxt);
    th.appendChild(rUser);

    let rCreated = document.createElement("TD");    
    let rCreatedTxt = document.createTextNode("Created");
    rCreated.appendChild(rCreatedTxt);
    th.appendChild(rCreated);

    let rDiff = document.createElement("TD");    
    let rDiffTxt = document.createTextNode("Diff");
    rDiff.appendChild(rDiffTxt);
    th.appendChild(rDiff);

    table.appendChild(th);

    let rev1, rev2;

    // create a row for every revision
    for (let i = 0; i < resultLength; i++) {
      let revisionId = response.data.result[i].REVISIONID;
      let revisionUser = response.data.result[i].USERNAME;
      let revisionCreated = response.data.result[i].CREATED;

      let row = document.createElement("TR");    
      row.id = "row" + revisionId;

      rId = document.createElement("TD");    
      rIdTxt = document.createTextNode(revisionId);
      rId.appendChild(rIdTxt);
      row.appendChild(rId);

      rUser = document.createElement("TD");    
      rUserTxt = document.createTextNode(revisionUser);
      rUser.appendChild(rUserTxt);
      row.appendChild(rUser);

      rCreated = document.createElement("TD");    
      rCreatedTxt = document.createTextNode(revisionCreated);
      rCreated.appendChild(rCreatedTxt);
      row.appendChild(rCreated);

      let checkBoxTr = document.createElement("TD");    
      let checkBox = document.createElement("INPUT");
      checkBox.id = "cb" + revisionId;
      checkBox.type = "checkbox";
      checkBoxTr.appendChild(checkBox);
      let label = document.createElement('label')
      label.htmlFor = checkBox;

      checkBox.addEventListener("change", function() {
        alert(checkBox.id);

        // check state first and then

        if (checkBox.checked) {  
          if (rev1 === undefined && rev2 === undefined) {
            rev1 = checkBox.id;      
          } else if (rev1 !== undefined && rev2 === undefined) {
            rev2 = checkBox.id;      
          } else if (rev1 === undefined && rev2 !== undefined) {
            rev1 = checkBox.id;      
          } else if (rev1 !== undefined && rev2 !== undefined) {
            // uncheck existing rev1   
            rev1 = checkBox.id;   
          }

          alert("rev1 is "+rev1+" rev2 is "+rev2);
       } else {

          alert("rev1 is "+rev1+" rev2 is "+rev2);
       }

      });

      row.appendChild(checkBoxTr);
      table.appendChild(row);
    }

    let diffButton = document.createElement("BUTTON");
    diffButton.id = "diffButton";
    let diffLabel = document.createTextNode("View Diff");
    diffButton.appendChild(diffLabel);
    
    swapChildNodes(table,diffButton);

    diffButton.addEventListener("click", function(){
      alert("diff for "+rev1+" and "+rev2);  
      
    });


    }, (error) => {
      // alert(error);
    });

  });

  /* List all categories for this page */
  catLink = document.getElementById("categories");
  catLink.addEventListener("click", function(){

    makeActive("categories");

    axios.get(hosturl+'/internal/blocks/'+blockid+'/categories').then((response) => {

      const resultLength = response.data.result.length; 

      let categoryList = document.createElement("UL");

      for (let i = 0; i < resultLength; i++) {

        let categoryItem = document.createElement("LI");
        let categoryText = document.createTextNode(response.data.result[i].CATEGORYTEXT);
        categoryItem.appendChild(categoryText);
        categoryList.appendChild(categoryItem);
      }
     
      swapChildNodes(categoryList);
 
    });

  });

  /* update the nav's active tab */
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

  /* Display new tab's UI */
  function swapChildNodes() {
    contentDiv = document.getElementById("page_data");
    while (contentDiv.firstChild) {
      contentDiv.removeChild(contentDiv.firstChild);
    }

    for (let i = 0; i < arguments.length; i++) {
       contentDiv.appendChild(arguments[i]);
    }
  }

});
