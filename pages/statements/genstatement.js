import { populateSelects } from "../receipts/viewReceipts.js";
import { popup, manageModalButtons, statements } from '../../script.js';

export function init() {
    console.log('gen statement');
    document.getElementById('genForm').addEventListener('submit', handleGenStatement);
    initForm();    
    statements.splice(0);
    Array.from(document.querySelectorAll('input[name="format"]')).forEach((el)=>{
        el.addEventListener('change',(e)=>{ if (e.target.checked) document.getElementById('formatQuestion').classList.remove('text-danger')})} );
}

async function initForm() {
    const invoiceViewMode=document.getElementById('invoiceViewMode').dataset.invoiceViewMode;
    console.log('viewMode ',invoiceViewMode)
    if (invoiceViewMode === 'manager') document.getElementById('staffSelector').classList.remove('restricted-disable');            
    if (invoiceViewMode === 'accountant') document.getElementById('clientSelector').classList.remove('restricted-disable');
    const result = await fetch('db/getCurrencyCodes', {method: 'GET', headers: {'Content-Type':'Application/json'} });
    const currencies = await result.json();
    populateSelects('currency', currencies.map((row)=>({ html: row, value: row })));
    const catResult = await fetch(`db/getClientCategories`, {method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'}});
    const categories = await catResult.json();
    populateSelects('category', categories.categories.map((row)=>({ html: row, value: row })));
    const sessionRes = await fetch('auth/session', { method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'}})
    const session = await sessionRes.json();    
    const teamResult = await fetch(`db/getTeamMembers`, {method: 'POST', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: session.user.id })});
    const team = await teamResult.json();
    team.forEach((staff)=>{
        const newOption = document.createElement('option');
        newOption.dataset.id = staff.id;        
        const name = `${staff.first_name} ${staff.last_name}`
        newOption.value = staff.id;
        newOption.innerHTML = name;
        document.getElementById('staff').appendChild(newOption);
    })
    const clientResult = await fetch(`db/getaccountantCustomers`, {method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'}});
    const clients = await clientResult.json();    
    clients.forEach((row)=>{
        const newOption = document.createElement('option');
        newOption.dataset.type = row.type;
        newOption.dataset.id=row.id;
        newOption.value = row.id;
        if (row.type == 'ind') {
            newOption.innerHTML = `${row.first_name} ${row.last_name}`   
        } else {
            newOption.innerHTML = row.organisation_name;
        }
        document.getElementById('client').appendChild(newOption);})
}

async function handleGenStatement(e) {
    e?.preventDefault();        
    if (Array.from(document.querySelectorAll('input[name="format"]')).every((el)=>!el.checked)) {
        popup('Please select which format (csv or pdf)')
        document.getElementById('formatQuestion').classList.add('text-danger');
        return;
    }     
    const ext = document.querySelector('input[name="format"]:checked').value;
    document.getElementById('formatQuestion').classList.remove('text-danger');    
    if (!document.getElementById('dateFrom').value) document.getElementById('dateFrom').value="1900-01-01";
    if (!document.getElementById('dateTo').value) document.getElementById('dateTo').value= todayISO();
    const formdata = new FormData(document.getElementById('genForm'));
    formdata.append('ext', ext);
    let arrayBuffer;

    const res = await fetch('db/genStatement', {method: 'POST', credentials: 'include', body: formdata});
    if (res.ok) {
        arrayBuffer = await res.arrayBuffer();

        /*if (document.getElementById('pdf').checked) {

            
            const res = await fetch('db/genPdfStatement', {method: 'POST', credentials: 'include', body: formdata});
            arrayBuffer = await res.arrayBuffer();
            
            //temporary to check the html
            /*const response = await res.json();                
            const blob = new Blob([response.html], {type: 'text/html' });
            const url = URL.createObjectURL(blob);*/
            
        /*} else {
            const res = await fetch('db/genCsvStatement', {method: 'POST', credentials: 'include', body: formdata});
            arrayBuffer = await res.arrayBuffer();

        }*/
        
        const [l, fileName, mimeType] = [statements.length, `Statement ${statements.length} ${new Date().toLocaleDateString('en-gb').replace('/','-')}.${ext}`, {pdf: 'application/pdf', csv:'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}];
        statements.push({
            fileName: fileName,
            mimeType: mimeType[ext],
            buffer: arrayBuffer
            });
        console.log('statements ', statements);
        const li = document.createElement('li');            
        li.innerHTML = `<i class="actionLink blue bi bi-trash3" id="removeFile-${l}"></i>&nbsp;
                                <input type="text" id = "viewStatement-${l}" value ="${fileName}" size="30" class="input-plain actionLink blue">&nbsp;<input type="text" size="10" class="input-plain" value ="${Math.round(arrayBuffer.byteLength / 1024)} KB">
                                &nbsp;<button type="button" id="changeName-${l}" class = "btn btn-outline-primary">Change</button>
                                <button type="button" id="submitName-${l}" class = "btn btn-outline-primary restricted-disable">Submit</button>
                                &nbsp;<button type="button" id="download-${l}" class = "btn btn-outline-primary">Download</button>
                                &nbsp;<button type="button" id="email-${l}" class = "btn btn-outline-primary">Email</button>`;
        li.id=`li-${l}`;
        li.classList.add('mt-2', 'noListType');
        document.getElementById('statements').appendChild(li);
        document.getElementById(`removeFile-${l}`).addEventListener('click', handleRemove);
        document.getElementById(`viewStatement-${l}`).addEventListener('click', handleView);
        document.getElementById(`changeName-${l}`).addEventListener('click', handleChangeName )
        document.getElementById(`submitName-${l}`).addEventListener('click', handleSubmitName)
        document.getElementById(`download-${l}`).addEventListener('click', handleDownload)
        document.getElementById(`email-${l}`).addEventListener('click', handleEmail)
    } else {
        popup('Problem generating the report');
    }
    
    //window.URL.revokeObjectURL(url);
}

function handleRemove(e) {
    manageModalButtons('yesButton', 'noButton');
    modalText.innerHTML="Are you sure?";        
    infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
    infoModal.show();
    document.getElementById('noButton').addEventListener('click',()=>{ 
        infoModal.dispose();
        manageModalButtons('closeButton');});
    document.getElementById('yesButton').addEventListener('click',()=>{ 
        const liNb = e.target.id.split('-')[1];
        document.getElementById(`li-${liNb}`).remove();        
        infoModal.dispose(); 
        manageModalButtons('closeButton'); });
}

async function urlToBase64(url) {
  return new Promise( async (resolve, reject) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      // result looks like: data:application/pdf;base64,XXXX
      resolve(reader.result);
    };
    reader.onerror = reject;
    return reader.readAsDataURL(blob);
  });
}


async function handleDownload(e) {    
    const i = e.target.id.split('-')[1];
    //const url = statements[i];    
    const a = document.createElement('a');
        a.href = getUrl(i);
        a.download = document.getElementById(`viewStatement-${i}`).value; // suggested filename
        document.body.appendChild(a);
        a.click();
        a.remove();
}

function getUrl(i) {
    const blob = new Blob([statements[i].buffer], {type: statements[i].mimeType})
    return URL.createObjectURL(blob);
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192; // 8KB chunks – safe and efficient

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binary);
}

function handleView(e) {
    const i = e.target.id.split('-')[1];
    if (statements[i].mimeType=="application/pdf") {
        window.open(getUrl(i), '_blank')
    } else {
        handleDownload(e);
    } }

function handleChangeName(e) {
    const i = e.target.id.split('-')[1];
    const input = document.getElementById(`viewStatement-${i}`);
    input.readonly=false;
    input.classList.remove('input-plain', 'actionLink');
    input.classList.add('link-disabled');
    input.removeEventListener('click', handleView);
    document.getElementById(`submitName-${i}`).classList.remove('restricted-disable');
    document.getElementById(`changeName-${i}`).classList.add('restricted-disable');
}

function handleSubmitName(e) {
    const i = e.target.id.split('-')[1];
    const input = document.getElementById(`viewStatement-${i}`);
    const isPdf = /^[\w\s\-().]+\.pdf$/i.test(input.value);
    if (isPdf) {
        input.readOnly=true;
        input.classList.add('input-plain', 'actionLink');
        input.classList.remove('link-disabled');
        input.addEventListener('click', handleView);
        document.getElementById(`submitName-${i}`).classList.add('restricted-disable');
        document.getElementById(`changeName-${i}`).classList.remove('restricted-disable');
    } else {
        popup('Please enter a valid file name');
    }
}

function handleEmail(e) {
    //recipients: {toAdresses: [...], ccAddresses: [...], BccAddresses: [...], replyToAddresses: [...]}
// attachements: [{attachement: (base64), fileName: ..., mimeType: (text/csv or application/pdf)},...,...]
//req.recipients, req.subject, req.template, req.variables, req.attachements
    const i = e.target.id.split('-')[1];    
    let fileName = document.getElementById(`viewStatement-${i}`).value;        
    const attachment = arrayBufferToBase64(statements[i].buffer)
    const body = {type: 'sendStatement', attachments: [{attachment: attachment, fileName: fileName, mimeType: statements[i].mimeType }] }
        
    return fetch('mail/sendRaw', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})    
    .then((reply)=>{
        if (reply.ok) {
            popup('Email sent!')
            return;
        } else {
            return reply.json();}})
    .then((response)=>{
        if (response) console.log('error: ', response)
    })
    .catch((err)=>console.log('error ',err))
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd}`;
}