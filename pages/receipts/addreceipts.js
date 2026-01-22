import {filesToUpload} from '../../script.js';
import { manageModalButtons, popup  } from '../../script.js';
import { populateSelects } from './viewReceipts.js';

export async function init() {
    console.log('add receipt');
    const invoiceViewMode = document.getElementById('invoiceViewMode').dataset.invoiceViewMode;    
    if (invoiceViewMode=="accountant") {        
        document.getElementById('accountantOnly').classList.remove('restricted-disable');
        const customersRes = await fetch('/db/getAccountantCustomers', { method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'}})
        const customers = await customersRes.json();
        const customersToDisplay = customers.map((row)=>{ 
            if (row.type=="org") return { html: row.name, value: row.id }
            return { html: `${row.first_name} ${row.last_name}`, value: row.id }
        })
        console.log('to display ',customersToDisplay);
        populateSelects('client', customersToDisplay);
        document.getElementById('client').addEventListener('change',(e)=> handleClient(e, customers))
        document.getElementById('staff').addEventListener('change',handleStaff) }
    if (invoiceViewMode == "organisation") {
        ['accountantOnly','staffLabel', 'staff'].forEach((el)=>document.getElementById(el).classList.remove('restricted-disable'));
        ['client', 'clientLabel'].forEach((el)=>document.getElementById(el).classList.add('restricted-disable'));        
        const staffRes = await fetch('db/getOrganisationStaff', { method: 'POST', credentials: 'include', headers: {'Content-type':'Application/json'}, body: JSON.stringify({ organisation_id: user.organisation_id } )})
        const staff = await staffRes.json();
        populateSelects('staff', staff.map((row)=>({ html: `${row.first_name} ${row.last_name}`, value: row.id })));        
    }
    initializeDropZone();    
    initializeManualEntry();
    filesToUpload.splice(0);
    console.log('files to upload size ',filesToUpload.length);
}
function initializeDropZone() {
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");
    const fileList = document.getElementById("fileList");    
    
    // Click to open file dialog
    dropzone.addEventListener("click", () => fileInput.click());
    // When files selected manually
    fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
    // Drag over styling
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");    });
    // Drag leave styling
    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");    });
    // Handle dropped files
    dropzone.addEventListener("drop", (e) => {
        console.log('dropped');
        e.preventDefault();
        dropzone.classList.remove("dragover");
        handleFiles(e.dataTransfer.files)
        /*let allGood=true;
        let allowedFileExt = ['pdf', 'jpg', 'png', 'gif'];    
        for (const file of e.dataTransfer.files) {
            const fileExt = file.name.split('.')[1];
            console.log('file type ', fileExt);
            if (allowedFileExt.includes(fileExt)) {
                handleFiles([file]);
            } else {
                allGood=false;
            } }*/
        
    });
    document.getElementById('submitFiles').addEventListener('click',()=>{
            submitFiles(filesToUpload);
        })
    document.getElementById('fileInput').addEventListener('change', (e)=>handleFiles(e.target.files));
}
// Utility: display file names
function handleFiles(files) {
    let allGood=true;    
    let allowedFileExt = ['pdf', 'jpg', 'png', 'gif'];  
    //let filesToUpload = [];  
    for (let file of files) {        
        console.log('file ',file);
        console.log('files ',filesToUpload);
        const l = filesToUpload.length;
        const fileExt = file.name.split('.')[1];
            console.log('file type ', fileExt);
            if (allowedFileExt.includes(fileExt)) {                
                const li = document.createElement("li");
                li.classList.add('d-flex', 'align-items-center')
                li.id=`li-${l}`
                li.innerHTML = `<i class="actionLink blue bi bi-trash3" id="removeFile-${l}"></i>&nbsp;
                                <input type="text" value ="${file.name} (${Math.round(file.size / 1024)} KB)" size="50" class="input-plain">&nbsp; 
                                <span>Comment:</span>&nbsp;                       
                                <input style="display: inline;" id="comment-${l}" name="comment-${l}">`;
                fileList.appendChild(li);        
                document.getElementById(`removeFile-${l}`).addEventListener('click',(e)=>{               
                    document.getElementById(`li-${l}`).remove();
                    filesToUpload[l].file=null;
                    console.log('files to upload', filesToUpload)
                    !filesToUpload.find((el)=>el.file)?document.getElementById('submitFiles').classList.add('restricted-disable'):null;                    
                    console.log(!filesToUpload.find((el)=>el.file))
                })
                filesToUpload.push({id: filesToUpload.length, file: file});
            } else {
                allGood=false;
            }
        
        // Upload to backend here if needed
        // uploadFile(file);
    }
    if (!allGood) popup('One or more files could not be processed.')
    if (!filesToUpload.length==0) document.getElementById('submitFiles').classList.remove('restricted-disable');
}

async function handleClient(e, customers) {
    // populate the staff if the client chosen is an organisation        
    console.log('handleClient');
    document.getElementById('staff').innerHTML="";
    populateSelects('staff', [{ html:'', value: null }])
    const clientId = e.target.value;
    const client = customers.find((client)=>client.id==clientId);    
    console.log('customers ', customers);
    console.log('client ', client);
    if (client?.type=="org") {
        const staffRes = await fetch('db/getOrganisationStaff', { method: 'POST', credentials: 'include', headers: {'Content-type':'Application/json'}, body: JSON.stringify({ organisation_id: client.id })})
        const staff = await staffRes.json();
        populateSelects('staff', staff.map((row)=>({ html: `${row.first_name} ${row.last_name}`, value: row.id })))
        console.log('test ',document.getElementById('staffLabel'));
        ['staff', 'staffLabel'].forEach((el)=>document.getElementById(el).classList.remove('restricted-disable'));
    } else {
        document.getElementById('id').value = e.target.value;    
        ['staff', 'staffLabel'].forEach((el)=>document.getElementById(el).classList.add('restricted-disable'));
    }

}

function handleStaff({ target }) {
    document.getElementById('id').value = target.value;
}

async function submitFiles() {
    const formdata=new FormData();
    console.log('files to upload ',filesToUpload);    
    for (let i=0; i< filesToUpload.length; i++) {
        const file=filesToUpload[i].file;
        if (file) {
            console.log(file)
            formdata.append("files[]", file);            
            formdata.append("comments[]", document.getElementById(`comment-${i}`).value); 
            //console.log('userId before append ', userId)
            //formdata.append("userId[]", parseInt(userId));           
        } }
    return fetch('api/upload', {method: 'POST', credentials: 'include', body: formdata})
    .then((result)=>{
        if (result.ok) {
            console.log('result ok')
            return result.json()}
        else {
            console.log('result not ok')
            console.log('problem uploading files');
            manageModalButtons('closeButton');
            popup('Problem uploading files');
            return new Array(filesToUpload.length).fill({success: false})
        } })
    .catch((err)=>{
        console.log('error :', err)
        return new Array(filesToUpload.length).fill({success: false}) })
    .then((result)=>{        
        console.log('result: ',result);
   
        for (let i=0; i<result.length; i++) {
            const file=result[i];
            const target=document.getElementById(`li-${i}`)
            target.innerHTML = target.innerHTML.split('</i>')[1].split('Comment:')[0]
            if (file.success) {                    
                target.innerHTML+='Receipt processed successfully';
                target.classList.add('text-success');
            } else {
                target.innerHTML+='Problem processing receipt';
                target.classList.add('text-danger');
            }
        }
    })
    .catch((err)=>{
        console.log('error', err)
        manageModalButtons('closeButton');
        return popup('Problem uploading files');
    })
}

async function initializeManualEntry() {
    document.getElementById('ShowFormButton').addEventListener('click',()=>{        
        document.getElementById("insertForm").classList.toggle('restricted-disable')
    })
    document.getElementById('addReceipt').addEventListener('submit', handleManualSubmit)
    const catResult = await fetch(`db/getClientCategories`, {method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'}});
    const categories = await catResult.json();
    const cat = categories.categories.map((el)=>({html: el.category, value: el.category}));
    populateSelects('category', cat);
    const currResult = await fetch('db/getCurrencyCodes', {method: 'GET', headers: {'Content-Type':'Application/json'} });
    const currencies = await currResult.json();    
    populateSelects('currency', currencies.map((el)=>({ html: el, value: el })));
}

function handleManualSubmit(e) {
    e.preventDefault();
    const required = ['date', 'amount', 'vat', 'currency', 'id'];
    if (required.some((el)=>!document.getElementById(el).value)) {
        return popup('Please fill all the required fields');
    }
    console.log('date ', document.getElementById('date').value)
    console.log('now ',new Date())
    if (new Date(document.getElementById('date').value) > new Date()) {
        return popup('The date cannot be after today');
    }
    const formdata = new FormData(e.target);
    formdata.append('viewMode', document.getElementById('invoiceViewMode').dataset.invoiceViewMode);
    fetch('/db/addManualReceipt', { method: 'POST', credentials: 'include', body: formdata })
    .then((res)=>res.json()).then((result)=>{
        if (result.success) {
            popup('Receipt uploaded!');
            e.target.reset();
        } else {
            popup('Error ' + result.error);
        }
    })
}