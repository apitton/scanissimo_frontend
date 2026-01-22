import {popup, manageModalButtons, restoreFooter} from '../../script.js'
export function init() {    
    console.log('view receipts');
    document.getElementById('searchForm').addEventListener('submit', handleSearchForm);
    fetch('auth/session').then((res)=>res.json())
    .then((res)=>{
        document.getElementById('userId').value=res.user.id;
        document.getElementById('userEmail').value=res.user.email;
        document.getElementById('organisation_id').value=res.user.organisation_id;
        console.log(res.user.id);
        console.log(res);
        if (res.user.organisation_id) document.getElementById('validateSelector').classList.remove('restricted-disable');
    })
    .then(()=>initForm())
    .then(()=>{
        document.getElementById('generateLink').addEventListener('click', handleGenerateLink);
        document.getElementById('dlLinkCopy').addEventListener('click', handleDlCopy);
        document.getElementById('dlLinkEmail').addEventListener('click', handleDlSend);    
        document.getElementById('viewInvoicesModal').querySelectorAll('.modalChoice').forEach((el)=>el.addEventListener('click',handleModalElement));
    })
}

async function initForm() {    
    const invoiceViewMode = document.getElementById('invoiceViewMode').dataset.invoiceViewMode;
    console.log('invoiceviewmode ', invoiceViewMode)
    if (invoiceViewMode === 'manager') {
        ['staffSelector', 'validateModal'].forEach((el)=>document.getElementById(el).classList.remove('restricted-disable'));        
    }
    if (invoiceViewMode === 'accountant') document.getElementById('clientSelector').classList.remove('restricted-disable');
    ['category', 'currency', 'staff', 'client'].forEach((el)=>{
        document.getElementById(el).innerHTML="";
        const blankSelect = document.createElement('option');                
        document.getElementById(el).appendChild(blankSelect);
    })
    const catResult = await fetch(`db/getClientCategories`, {method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'}});
    const categories = await catResult.json();
    const cat = categories.categories.map((el)=>({ html: el.category, value: el.category }));
    populateSelects('category', cat);
    const currResult = await fetch('db/getCurrencyCodes', {method: 'GET', headers: {'Content-Type':'Application/json'} });
    const currencies = await currResult.json();    
    populateSelects('currency', currencies.map((el)=>({ html: el, value: el })))
    const teamResult = await fetch(`db/getTeamMembers`, {method: 'POST', credentials: 'include', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({ id: document.getElementById('userId').value})});
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
    //get currencies, get team members, get clients and fill the selects
}

async function handleSearchForm(e) {    
    const maxRes=5;
    e?.preventDefault();
    console.log('invoiceviewMode ', document.getElementById('invoiceViewMode').dataset.invoiceViewMode);
    if (document.getElementById('invoiceViewMode').dataset.invoiceViewMode=="") document.getElementById('viewMode').value="ind-self";
    if (document.getElementById('invoiceViewMode').dataset.invoiceViewMode=="manager") document.getElementById('viewMode').value="ind-manager";
    if (document.getElementById('invoiceViewMode').dataset.invoiceViewMode=="accountant") {
        if (document.getElementById('invoiceViewMode').dataset.type=='ind') {
            document.getElementById('viewMode').value="ind-accountant"
        } else {
            document.getElementById('viewMode').value="org-acc";
        } 
    }
    if (document.getElementById('invoiceViewMode').dataset.invoiceViewMode=="organisation") document.getElementById('viewMode').value="org-self";
    const formdata = new FormData(document.getElementById('searchForm'));
    const reply = await fetch('db/findReceipts', {method: 'POST', credentials: 'include', body: formdata});
    const results = await reply.json();
    console.log(results);
    let toDisplay;
    searchResults.innerHTML='';
    document.getElementById("pagination").innerHTML='';
    if (results.length==0) {
        toDisplay = document.createElement('p');
        toDisplay.innerHTML='No results to display. Try expanding the search criteria';
        document.getElementById("paginationMessage").innerHTML='';        
        document.getElementById('actionButtons').classList.add('restricted-disable');
        document.getElementById('maxResults').innerHTML='';
    } else {
        const is_org=!!document.getElementById('organisation_id').value;
        toDisplay = document.createElement('table');
        toDisplay.innerHTML=`<thead><tr><th>Date</th><th>Amount</th><th>VAT</th><th>Category</th><th>Supplier</th><th>Currency</th>${is_org?'<th>Validated</th>':''}<th>Select</th></tr></thead><tbody></tbody>`
        toDisplay = fillTable(toDisplay, results, 0, maxRes);        
        toDisplay.classList.add('table', 'table-striped', 'table-hover');
        document.getElementById('actionButtons').classList.remove('restricted-disable');
        document.getElementById('downLoadReceipts').addEventListener('click',()=>handleDownload(results));
        document.getElementById('deleteReceipts').addEventListener('click', ()=>handleDelete(results));
        const searchResults = document.getElementById('searchResults');      
        const pagination = document.createElement('nav');
        pagination.classList.add('d-flex', 'align-items-center');
        pagination.innerHTML=producePagination(Math.ceil(results.length / maxRes),'pagination');
        document.getElementById('pagination').appendChild(pagination);
        document.getElementById('paginationMessage').innerHTML=`Displaying results ${1}-${Math.min(maxRes,results.length)} of ${results.length}`;
        document.getElementById('maxResults').innerHTML='<span>Results per page:&nbsp;</span><li class="page-item"><span class="link currentMaxRes page-link" data-nb="5">5</span></li> <li class="page-item"><span class="link page-link" data-nb="10">10</span></li> <li class="page-item"><span class="link page-link" data-nb="15">15</span></li> <li class="page-item"><span class="link page-link" data-nb="20">20</span></li>';
        document.getElementById('maxResults').addEventListener('click',(e)=>handleMaxResults(e,results,toDisplay));
        pagination.addEventListener('click',(e)=>handlePagination(e, results, toDisplay));
    }
    toDisplay.classList.add('w-100');
    searchResults.appendChild(toDisplay);
    
}

function fillTable(toDisplay, results, fromNb, maxRes) {
    results=results.slice(fromNb, Math.min(fromNb + maxRes, results.length));
    const is_org = !!document.getElementById('organisation_id').value;
    results.forEach((row)=>{     
        console.log('row ',row)           
        const newRow=document.createElement('tr');
        newRow.innerHTML=`<td class="link first">${convertDate(row.receipt_date, 'en-GB')}</td><td class="link first">${row.receipt_amount || 0}</td><td class="link first">${row.receipt_vat || 0}</td><td class="link first">${row.receipt_category || ''}</td><td class="link first">${row.receipt_supplier || ''}</td><td class="link first">${row.receipt_currency || ''}</td>${is_org?`<td class="link-disabled"><span id="val-${row.id}">${row.validation_timestamp?'&#x2705':'&#x23F3'}</span></td>`:''}<td><input type='checkbox' id='box-${row.id}'/></td>`
        newRow.id='row-' + row.id;        
        toDisplay.querySelector('tbody').appendChild(newRow);  
        newRow.querySelectorAll('.link.first').forEach((el)=>el.addEventListener('click', ()=>handleRowClick(row)))
        //newRow.addEventListener('click',(e)=>handleRowClick(e,row));
        console.log('val ', newRow.querySelector(`#val-${row.id}`));
        if (!row.validation_timestamp && document.getElementById('invoiceViewMode').dataset.invoiceViewMode=="manager") {
            newRow.querySelector(`#val-${row.id}`).addEventListener('click', ()=>validateReceipt(row.id, false));
            newRow.querySelector(`#val-${row.id}`).classList.add('link');
        }
                         
        })  
    return toDisplay;
}

function producePagination(n,className) {
    const paginationHTML =`        
            <ul class="pagination d-flex align-items-center">
                <li class="page-item">
                    <span class="${className} link-faded link page-link previous" data-nb="previous" aria-label="Previous">&laquo;</span>
                </li>
                ${produceli(n)}
                <li class="page-item">
                    <span class="${className} link ${n<2?'link-faded ':''}page-link next" data-nb="next" aria-label="Next">&raquo;</span>
                </li>
            </ul>`
    function produceli(k) {
        let res='';        
        for (let i=1; i<=k; i++) {
            res += `<li class="page-item"><span class="${className} ${i==1?'currentPagination ':''}link page-link" id="pagination-${i}" data-nb=${i}>${i}</span></li>`;
        }
        return res;
    }
    return paginationHTML;
}
function handlePagination(e, results, toDisplay) {
    const maxRes=parseInt(document.querySelector('.currentMaxRes').dataset.nb);    
    const prevEl = document.getElementById('pagination').querySelector('.currentPagination');
    console.log(prevEl);
    const prevPageNb = prevEl.dataset.nb;
    const clickedLink = e.target.dataset.nb;
    let newPageNb;
    switch (clickedLink) {
        case 'previous':
            console.log('previous ',prevPageNb,' ',prevPageNb-1)
            newPageNb=parseInt(prevPageNb)-1;
            break;
        case 'next':
            console.log('next ',prevPageNb,' ',prevPageNb+1)
            newPageNb=parseInt(prevPageNb)+1;
            break;
        default:            
            newPageNb=clickedLink;
            console.log('default ',newPageNb);
    }
    toDisplay.querySelector('tbody').innerHTML='';
    fillTable(toDisplay, results, (newPageNb-1)*maxRes, maxRes);
    const prev = e.currentTarget.querySelector('.previous');
    const next = e.currentTarget.querySelector('.next');
    if (newPageNb==1) {
        prev.classList.add('link-faded');
    } else if (prev.classList.contains('link-faded')) {
        prev.classList.remove('link-faded');
    }
    if (newPageNb * maxRes >= results.length) {
        next.classList.add('link-faded');
    } else if (next.classList.contains('link-faded')) {
        next.classList.remove('link-faded');
    }
    prevEl.classList.remove('currentPagination');
    console.log(`#pagination-${newPageNb}`);
    e.currentTarget.querySelector(`#pagination-${newPageNb}`).classList.add('currentPagination');
    document.getElementById('paginationMessage').innerHTML=`Displaying results ${(newPageNb-1)*maxRes+1}-${Math.min(newPageNb*maxRes,results.length)} of ${results.length}`
}
function handleMaxResults(e, results, toDisplay) {
    const maxRes=e.target?.dataset?.nb;    
    if (!maxRes) {
        return null;
    }
    toDisplay.querySelector('tbody').innerHTML='';
    fillTable(toDisplay, results, 0, maxRes);
    const pagination = document.querySelector('#pagination > nav');
    pagination.innerHTML=producePagination(Math.ceil(results.length / maxRes),'pagination');
    document.getElementById('paginationMessage').innerHTML=`Displaying results ${1}-${Math.min(maxRes,results.length)} of ${results.length}`;
    document.querySelector('.currentMaxRes').classList.remove('currentMaxRes');
    e.target.classList.add('currentMaxRes');
}
function aggregateTickedReceipts() {
    let receipts=[];
    const tickedBoxes=document.querySelectorAll('#searchResults input:checked')
    console.log(tickedBoxes);
    tickedBoxes.forEach((el)=>{
        const receiptId=parseInt(el.id.split('-')[1]);
        receipts.push(receiptId);        
    })
    console.log('receipts ',receipts)
    return receipts;
}
export function handleGenerateLink(id=null) {
    let receipts;
    !id?receipts=aggregateTickedReceipts():receipts=[id];
    if (receipts.length==0) {
        console.log('no box ticked');
    } else {
        fetch('db/generateDownloadLink',{method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({receipts: receipts})})
        .then((reply)=>reply.json())
        .then((response)=>{
            console.log('link ',response)
            if (!id) {
                popup('Link generated!');
                document.getElementById('dlLink').classList.remove('noOpacity');
                document.getElementById('dlLinkInput').value=response.link;
            } else {
                navigator.clipboard.writeText(response.link);
                document.getElementById('modalInvoiceInfo').innerHTML="Link copied to clipboard!"
            }
        })        
        .catch((err)=>console.log('problem ',err)) }
}
function handleDlCopy() {
    const link = document.getElementById('dlLinkInput').value;
    console.log(link);
    navigator.clipboard.writeText(link);
}

function handleDlSend() {
    //expects {template: 'template_name || none', variables: {variables} || none, subject: 'subject', recipients: [recipients], text: 'text || none'}    
    const body = {template: 'send_link', variables: {link: document.getElementById('dlLinkInput').value}, subject: 'Your Scanceipt invoice link', recipients: [document.getElementById('userEmail').value]};
    console.log('body ', body);
    fetch('mail/send', { method: 'POST', headers: {'Content-Type':'Application/json'}, body: JSON.stringify(body) })
    .then((result)=>console.log('mail sent'))
    .catch((err)=>console.log('problem sending email ', err))
}

export function handleModalElement(e) {
    document.getElementById('viewInvoicesModal').querySelector('.currentPagination').classList.remove('currentPagination');
    e.target.classList.add('currentPagination');
    const target=e.target.dataset.link;
    console.log('target ', target);
    const activeElement=document.getElementById('viewInvoicesModal').querySelector('.activeElement');
    if (activeElement) {
        console.log('active element ', activeElement.id);
        activeElement.classList.remove('activeElement');
        activeElement.classList.add('restricted-disable'); }
    document.getElementById(target).classList.remove('restricted-disable');
    document.getElementById(target).classList.add('activeElement');
}

function handleRowClick(row) {
    console.log(row);    
    /*if (e.target.classList.contains('link-disabled')) {        
        return '';    }*/
    document.getElementById('viewInvoicesModal').querySelector('.currentPagination').classList.remove('currentPagination');
    document.getElementById('showInvoiceDetails').classList.add('currentPagination');
    document.getElementById('invoiceItems').innerHTML='';
    const container=document.getElementById('invoiceImage');
    const modalDisplays=document.querySelectorAll('.modalDisplay');
    modalDisplays.forEach((modalDisplay)=>modalDisplay.id!='invoiceDetails'?modalDisplay.classList.add('restricted-disable'):modalDisplay.classList.remove('restricted-disable'));
    const modalChoices=document.querySelectorAll('.modalChoice');
    modalChoices.forEach((modalChoice)=>modalChoice.id!='showInvoiceDetails'?modalChoice.classList.remove('currentPagination'):modalChoice.classList.add('currentPagination'));
    //filling up details section
    const toDisplay = ['receipt_amount', 'comment', 'receipt_amount', 'receipt_date', 'receipt_supplier', 'receipt_vat', 'added_on', 'validated_by_manager' ]    
    for (const [key, value] of Object.entries(row)) {        
        let newValue;
        (key=='receipt_date' || key=='date_added')?newValue=convertToISO(convertDate(value)):newValue=value;
        console.log('key ', key, 'value ', newValue);                
        toDisplay.includes(key)?document.getElementById(key).value = newValue:null; 
    }               
    document.getElementById('receipt_category_value').innerHTML=row.receipt_category;
    document.getElementById('receipt_currency_value').innerHTML=row.receipt_currency;
    const viewMode = document.getElementById('invoiceViewMode').dataset.invoiceViewMode;
    const validated = document.getElementById('validated_by_manager');
    row.validation_timestamp?validated.innerHTML='&#x2705':validated.innerHTML=`&#x23F3`;            
    document.getElementById('invoiceAmountExVat').value=Math.round((row.receipt_amount - row.receipt_vat)*100)/100;    
    //filling up items section
    fetch('db/getReceiptItems', {method: 'POST', headers: {'Content-Type':'Application/json'}, body: JSON.stringify({receipt_id: row.id})})
    .then((reply)=>reply.json())
    .then((result)=>{
        console.log('result ',result);
        if (result.length==0 || !result) {
            document.getElementById('invoiceItems').innerHTML="There are no items to display"
        } else {            
            const itemsTable = document.createElement('table');
            itemsTable.setAttribute('id', 'receiptItems');
            itemsTable.classList.add('table', 'table-striped');
            itemsTable.innerHTML='<thead><tr><th>Item</th><th>Item Price</th><th>VAT</th><th>ex VAT</th><th>Nb</th></tr><th>Sub Total</th></tr></thead><tbody></tbody>'
            document.getElementById('invoiceItems').appendChild(itemsTable);
            result.forEach((row)=>{                
                const newRow = document.createElement('tr');                
                newRow.innerHTML = `
                    <td>${row.item}</td>
                    <td>${Math.round(row.item_unit_price*100)/100}</td>
                    <td>${row?.item_vat || 0 }</td>
                    <td>${row?.item_vat?Math.round((row.item_unit_price-row?.item_vat)*100)/100:Math.round(row.item_unit_price*100)/100}</td>`;
                console.log('newRow ',newRow.innerHTML);
                itemsTable.querySelector('tbody').appendChild(newRow);
                console.log('last');                
            });            
            return fetch('db/getReceiptImg',{ method: 'POST', headers: {'Content-Type': 'Application/json'}, body:JSON.stringify({path: row.storage_path})})
        }    
    })    
    //filling up the image
    .then((res)=> {
        container.innerHTML = ""; // Clear previous content
        if (!res.ok) console.log('file not found')
        const contentType=res.headers.get("Content-Type");
        console.log('content type ', contentType);
        return res.blob().then(blob=>({blob, contentType}));
        })
    .then(({blob, contentType})=>{
        console.log('file type: ', contentType);
        const fileURL = URL.createObjectURL(blob);                
        if (contentType.includes("pdf")) {
            // Display PDF
            container.innerHTML = `
                <embed src="${fileURL}" type="application/pdf" width="100%" height="800px" />
            `;
        } else if (contentType.startsWith("image/")) {
            // Display image
            const img = document.createElement("img");
            img.src = fileURL;
            img.style.maxWidth = "100%";
            img.style.overflow = "auto"
            img.style.maxHeight = "75vh";
            container.appendChild(img);
        } else {
            // Fallback: show as text
            container.innerHTML = "Image not available";
        } })        
    .catch((err)=>console.log('error retrieving img ', err.details))
    const modal = new bootstrap.Modal(document.getElementById('viewInvoice'));
    // add event listeners to buttons
    document.getElementById('genLinkModal').addEventListener('click',()=>handleGenerateLink(row.id))
    document.getElementById('downloadModal').addEventListener('click',()=>handleDownload([row], row.id))
    document.getElementById('deleteModal').addEventListener('click',()=>handleDelete(row.id, modal))
    document.getElementById('editModal').addEventListener('click',()=>handleEdit(row));
    console.log('row', row);
    if (document.getElementById('invoiceViewMode').dataset.invoiceViewMode=='manager') {
        console.log('here')
        if (!row.validation_timestamp) {
            console.log('there')
            document.getElementById('validateModal').classList.remove('faded');
            document.getElementById('validateModal').addEventListener('click',()=>validateReceipt(row.id, true))
        } else {
            document.getElementById('validateModal').classList.add('disabled');
        }
    }    
    document.getElementById('modalInvoiceClose').addEventListener('click', ()=> {
        restoreFooter();        
        restoreModalDisplay();});
    modal.show();
}

async function validateReceipt(id, modal) {
    console.log('validate');
    if(modal) {
        document.getElementById('modalInvoiceInfo').innerHTML="Are you sure?";
        document.getElementById('modalInvoiceInfo').classList.add('text-alert');
        setModalInvoiceButtons(['modalInvoiceNo', 'modalInvoiceYes'])
        document.getElementById('modalInvoiceYes').addEventListener('click',()=>{
            validate(id)
            .then((result)=>{
                if (result) {
                    document.getElementById('validated_by_manager').innerHTML=`&#x2705`;                    
                    document.getElementById('validateModal').classList.add('faded');
                    restoreFooter();                    
                    document.getElementById('modalInvoiceInfo').innerHTML="<span class='text-success'>Receipt validated</span>";
                    refreshResults();
                }
                })
        })
        document.getElementById('modalInvoiceNo').addEventListener('click',restoreFooter);   
    } else {
        let infoModal;
        const modalText = document.getElementById('infoText');  
        modalText.innerHTML="This cannot be undone. Are you sure?";
        manageModalButtons(['yesButton', 'noButton']);            
        infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
        infoModal.show();
        document.getElementById('yesButton').addEventListener('click', ()=> {
            infoModal.dispose();
            const newInfoModal = new bootstrap.Modal(document.getElementById('infoModal'));        
            validate(id)
            .then(()=>{
                manageModalButtons(['closeButton']);
                document.getElementById('infoText').innerHTML="Receipt validated";                    
                newInfoModal.show();
                refreshResults();
            }) })
        document.getElementById('noButton').addEventListener('click', ()=> { 
            infoModal.dispose();});
    }
    function validate(id) {
        return fetch('/db/validateReceipt', { method: 'POST', credentials: 'include', headers: {'content-type': 'Application/json'}, body: JSON.stringify({ receipt_id: id })})
        .then((res)=>res.json()).then((result)=>result.success);
    }    
}
function refreshResults() {
    const currentPage = document.getElementById('pagination').querySelector('.currentPagination');
    console.log('current page ',currentPage);
    const currentMaxRes = document.getElementById('maxResults').querySelector('.currentMaxRes');
    console.log('max res ',currentMaxRes);
    handleSearchForm()
    .then(()=>{
        currentPage.click();
        currentMaxRes.click();
    })
}
export function convertDate(dateToConvert, format='en-GB') {
    let date = new Date(dateToConvert);
    return date.toLocaleDateString(format).split('/').join('-').split('T')[0];   
}
export function convertToISO(d) {
    const [day, month, year] = d.split("-");
    return `${year}-${month}-${day}`;
}
export function handleDownload(results, id=null) {
    let receipts;
    !id?receipts=aggregateTickedReceipts():receipts=[id];
    receipts.lenght==0?popup('No receipt selected'):null;
    receipts.forEach((id)=>{
        const receipt = results.find(r=>r.id==id)
        const storage_path = receipt.storage_path;
        const extension=storage_path.split('.')[1];
        fetch('db/getReceiptImg',{ method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body:JSON.stringify({path: storage_path})})
        .then((res)=> {
            if (!res.ok) console.log('file not found')
            return res.blob();
            })
        .then((blob) => {                
            const fileURL = window.URL.createObjectURL(blob);
            const newLink = document.createElement('a');
            newLink.href=fileURL;
            console.log()
            newLink.download=`${convertDate(receipt.receipt_date) ||'pb'} ${receipt.receipt_supplier || 'pb'}.${extension}`
            newLink.click();
            document.body.removeChild(newLink);
            URL.revokeObjectURL(fileURL);
            })        
        } )
    if (!id) {
        popup('Receipts Downloaded');
    } else {
        restoreFooter();
        document.getElementById('modalInvoiceInfo').innerHTML='Receipts downloaded';    }
    }

function setModalInvoiceButtons(buttons) {
    document.querySelectorAll('.modalInvoiceButton').forEach((el)=>buttons.includes(el.id)?el.classList.remove('restricted-disable'):el.classList.add('restricted-disable'));
}

export function handleDelete(results, id=null, modal=null) {
    let receipts;
    !id?receipts=aggregateTickedReceipts():receipts=[id];
    let infoModal;
    const modalText = document.getElementById('infoText');   
    if (id) {
        document.getElementById('modalInvoiceInfo').innerHTML="Are you sure?";
        document.getElementById('modalInvoiceInfo').classList.add('text-alert');
        setModalInvoiceButtons(['modalInvoiceNo', 'modalInvoiceYes'])
        document.getElementById('modalInvoiceYes').addEventListener('click',()=>{
            deleteReceipts([id])
            .then(()=>{
                restoreFooter();
                modal.dispose()})
        })
        document.getElementById('modalInvoiceNo').addEventListener('click',restoreFooter);                    
    } else {        
        if (receipts.length==0) {
            popup('No receipts selected');
        } else {
        modalText.innerHTML="The receipts you have selected will be permanently deleted. Are you sure?";
        manageModalButtons(['yesButton', 'noButton']);            
        infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
        infoModal.show();
        document.getElementById('yesButton').addEventListener('click', ()=> {
            infoModal.dispose();
            const newInfoModal = new bootstrap.Modal(document.getElementById('infoModal'));        
            deleteReceipts(receipts)
            .then(()=>{
                manageModalButtons(['closeButton']);
                document.getElementById('infoText').innerHTML="Receipt(s) deleted";                    
                newInfoModal.show();
            }) })
        document.getElementById('noButton').addEventListener('click', ()=> { 
            infoModal.dispose();
        }   ) } }
    refreshResults();
    function deleteReceipts(receipts) {
        receipts.forEach((id)=>{
            const receipt = results.find(r=>r.id==id)
            const storage_path = receipt.storage_path;
            fetch('db/deleteReceipt', {method: 'DELETE', headers: { 'Content-Type':'Application/json' }, body: JSON.stringify({id: id, storage_path: storage_path})})
            .then((res)=>res.json())                                
            .catch((err)=>console.log('error ', err)) })
        }    
}


function restoreModalDisplay() {
    document.querySelectorAll('.editable').forEach((el)=>el.classList.remove('editable'));
    document.getElementById('editModal').classList.remove('currentPagination');
    console.log('classlist removed');
    document.querySelectorAll('.modalChoice').forEach((el)=>el.id=='showInvoiceDetails'?el.classList.add('currentPagination'):el.classList.remove('currentPagination'))
    document.querySelectorAll('.modalDisplay').forEach((el)=>el.id=='invoiceDetails'?el.classList.add('activeElement'):el.classList.remove('activeElement'))
}

export function populateSelects(elementId, rows, data=null) {
    rows.forEach((row)=>{
        const newOption = document.createElement('option');
        newOption.value=row.value;
        newOption.innerHTML=row.html;
        newOption.dataset.data=data;
        document.getElementById(elementId).appendChild(newOption);
    })
    }


export async function handleEdit(receipt) {
    if (document.getElementById('userId')!=receipt.user_id) return popup('Only the receipt owner can amend an invoice.');        
    if (receipt.validation_timestamp) return popup('The receipt is validated and cannot be edited');
    const inputs = ['receipt_date','receipt_amount', 'receipt_vat', 'receipt_supplier', 'comment'];
    const selects = ['receipt_currency', 'receipt_category'];
    const toAmend = [...inputs, ...selects]
    inputs.forEach((el)=>document.getElementById(el).readOnly = false)
    toAmend.forEach((el)=>document.getElementById(el).classList.add('editable'));
    const result = await fetch('db/getCurrencyCodes', {method: 'GET', headers: {'Content-Type':'Application/json'} });
    const currencies = await result.json();    
    populateSelects('receipt_currency', currencies.map((row)=>({ html: row, value: row })))
    const catResult = await fetch(`db/getClientCategories`, {method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json'}});
    const categories = await catResult.json();
    populateSelects('receipt_category', categories.categories.map((row)=>({ html: row, value: row })));
    
    document.getElementById('editModal').classList.add('currentPagination');
    console.log('editModal class added')
    restoreFooter();
    document.getElementById("modalInvoiceCancel").classList.remove("restricted-disable");
    document.getElementById("modalInvoiceSave").classList.remove("restricted-disable");
    document.getElementById("modalInvoiceCancel").addEventListener('click',()=> {
        inputs.forEach((el)=>document.getElementById(el).readOnly = true);
        restoreFooter();
        toAmend.forEach((el)=>{
            console.log('el ', el)
            document.getElementById(el).classList.remove('editable')
            });
        document.getElementById('editModal').classList.remove('currentPagination');
    })
    document.getElementById("modalInvoiceSave").addEventListener("click",()=>{
        const body={};
        inputs.forEach((el)=>document.getElementById(el).readOnly = true);
        document.getElementById('viewInvoice').querySelectorAll('option').forEach((option)=>{
            !option.id?option.remove():null;
        })
        console.log('to amend ',toAmend);
        toAmend.forEach((el)=>body[el]=document.getElementById(el).value);
        body.modified_by_user=true;
        body.id=receipt.id;
        body.user_id = receipt.user_id;
        console.log(body);
        fetch('db/updateReceipt', {method: 'PUT', headers: {'Content-Type': 'Application/json'}, body: JSON.stringify(body) })
        .then((res)=>console.log('updated ',res))
        restoreFooter();
        document.getElementById('editModal').classList.remove('currentPagination');
        toAmend.forEach((el)=>el.classList.remove('editable'));
        document.getElementById('modalInvoiceInfo').innerHTML="Receipt updated";
        refreshResults();
    })
    


}