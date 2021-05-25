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
        let edits = textArea.value;
        axios.post(hosturl+'/internal/revisions','block_id='+blockid+'&revision_text='+edits).then((response) => {
           let resultText = (response.status === 201) ? 'Successful edit!' : 'Something went wrong.'; 
           let resultDiv = document.createElement("DIV");
           //resultDiv.className = "alert";
           resultDiv.className = "success";
           resultDiv.appendChild(document.createTextNode(resultText));
           form.appendChild(resultDiv);		
	   setTimeout("location.reload(true);", 1000);	
        });

      });

    });
  });
 
  /* History of the page */
  histLink = document.getElementById("history");
  histLink.addEventListener("click", function(){
    
    makeActive("history");

    /* A FIFO queue with a cap of 2 */ 	  
    let diffQueue = [];
  
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
      let label = document.createElement('LABEL')
      label.htmlFor = checkBox;

      checkBox.addEventListener("change", function() {
	if (checkBox.checked) {      
          if (diffQueue.length === 2) {
	    document.getElementById(diffQueue[0]).checked = false;	  
            diffQueue[0] = diffQueue[1];
	    diffQueue[1] = checkBox.id; 	
	  } else {
            diffQueue.push(checkBox.id);
	  }
        } else { // the checkBox was unchecked
          if (diffQueue[0] === checkBox.id) {
            diffQueue[0] = diffQueue[1];
	  }
	  // update tail in either case	
          diffQueue[1] = undefined;		  
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
      
      const diffUrl = hosturl + 
        '/internal/revisions/' + 
        diffQueue[0].substr(2) + 
        '/' + 
        diffQueue[1].substr(2);

      axios.get(diffUrl).then((response) => {

	// the remote data      
	const diff = response.data.result.diff;
	const leftDate = response.data.result.left.CREATED; 
	const rightDate = response.data.result.right.CREATED;
	const leftRevId = response.data.result.left.REVISIONID; 
	const rightRevId = response.data.result.right.REVISIONID;

	// construct the output      
	let diffOutput = document.createElement("DIV");
	let diffHeadText = document.createTextNode(
	 "Comparing revision " +
         leftRevId +
          " from " + leftDate + " with " +
         rightRevId +
          " from " + rightDate
	);
	
	let diffHead = document.createElement("H4");
	diffHead.appendChild(diffHeadText);
	diffOutput.appendChild(diffHead);

	for (let i = 0; i < diff.length; i++) {
          console.log(diff[i][0]);
	  let span = document.createElement("SPAN");

	  if (diff[i][0] === '+') {
            span.className = "addition";
	  } else if (diff[i][0] === '-') {
            span.className = "subtraction";
	  } 
   
	  // the actual text	
          span.appendChild(document.createTextNode(diff[i][1]));
	  diffOutput.appendChild(span);	
        }
        // TBD do a modal
	// table.appendChild(diffOutput); 
	makeModal(diffOutput);

      });

    });


    }, (error) => {
      alert(error);
    });

  });

  /* List all categories for this page */
  catLink = document.getElementById("categories");
  catLink.addEventListener("click", function(){

    makeActive("categories");

    // create an "add category" button and append it to the list of categories	  
    let categoryList = document.createElement("UL");
    axios.get(hosturl+'/internal/blocks/'+blockid+'/categories').then((response) => {

      const resultLength = response.data.result.length; 


      for (let i = 0; i < resultLength; i++) {

        let categoryItem = document.createElement("LI");
        let categoryText = document.createTextNode(response.data.result[i].CATEGORYTEXT);
        categoryItem.appendChild(categoryText);
        categoryList.appendChild(categoryItem);
      }
      //swapChildNodes(categoryList);
 
    });
    let addCatBtn = document.createElement("BUTTON");
    addCatBtn.appendChild(document.createTextNode("Add Category"));
    let addCatBtnLi = document.createElement("LI");
    addCatBtnLi.appendChild(addCatBtn);	 
    categoryList.appendChild(addCatBtnLi);

    // add category button functionality
	 
    addCatBtn.addEventListener("click", function(){
      let form = document.createElement("FORM");
      form.id = "addCategory";

      let textBox = document.createElement("INPUT");
      textBox.placeholder="Enter a category";
      textBox.type = "Text"	    
      textBox.id = "textCategory";
      textBox.setAttribute('width', '70%');	    
      textBox.setAttribute('size', '70');	    
      form.appendChild(textBox);

      /* submit button */
      let submitButton = document.createElement("BUTTON");
      submitButton.id = "submitText";
      let submitLabel = document.createTextNode("Submit");
      submitButton.appendChild(submitLabel);
      form.appendChild(document.createElement("BR"));
      form.appendChild(submitButton);

      submitButton.addEventListener("click", function() {
	alert(textBox.value);
	// check if category exists, if it doesn't, fail     
	/* const addCatUrl = hosturl + "/internal/blocks/" + 
		      blockid + "/categories/" + categoryid;
	
        axios.patch(addCaturl).then((response) => {
	});*/

      });

      makeModal(form);	    
    });

    swapChildNodes(categoryList);

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

  function makeModal(element) {
    // the background 
    console.log(element); 
    let modalBg = document.createElement("DIV");
    modalBg.className = "modal";
    let closeBtn = document.createElement("SPAN");
    //closeBtn.appendChild(document.createTextNode("&times;"));	  
    closeBtn.innerHTML = "&times;";	  
    closeBtn.className = "close";
    closeBtn.addEventListener("click", function(){
      modalBg.style.display = "none";

    });
    // attach closeBtn to modal-content	  
    let modal = document.createElement("DIV");
    	  
    modal.className = "modal-content";
    modal.appendChild(closeBtn);	  
    modal.appendChild(element);	  
    while (modalBg.firstChild) {
      modalBg.removeChild(modalBg.firstChild);
    }
    modalBg.appendChild(modal);
    modalBg.style.display = "block";
    // attach modalBg to body	  
    
    let body = document.getElementsByTagName("BODY")[0];
    	    
     body.appendChild(modalBg);	 
  }
/*
  window.onclick = function(event) {
    const modalBg = document.getElementById("modal");
    if (event.target === modalBg) {
      modalBg.style.display = "none";
    }
  } */
});
