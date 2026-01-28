import { handleGenerateLink, handleDownload, handleEdit, handleDelete, convertToISO, convertDate, handleModalElement } from './viewReceipts.js';
import { popup } from '../../script.js';
export function init() {
    console.log('view single receipt');
    fillData();
}

async function fillData() {
    const data = await JSON.parse(document.getElementById('mainSection').dataset.data);
    const receiptId = data.receiptId;
    console.log('data ',data);
    console.log('receipt id ',receiptId);
    const reply = await fetch(apiUrl+'db/getReceipt', {method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify({receipt_id: receiptId})});    
    const row = await reply.json();
    if (row.error) {
        document.getElementById('mainSection').innerHTML = '';
        popup(row.error);
        return;
    }
    console.log('row ',row);        
    document.querySelector('.currentPagination').classList.remove('currentPagination');
    document.getElementById('showInvoiceDetails').classList.add('currentPagination');
    document.getElementById('invoiceItems').innerHTML='';
    const modalDisplays=document.querySelectorAll('.modalDisplay');
    modalDisplays.forEach((modalDisplay)=>modalDisplay.id!='invoiceDetails'?modalDisplay.classList.add('restricted-disable'):modalDisplay.classList.remove('restricted-disable'));
    const modalChoices=document.querySelectorAll('.modalChoice');
    modalChoices.forEach((modalChoice)=>modalChoice.id!='showInvoiceDetails'?modalChoice.classList.remove('currentPagination'):modalChoice.classList.add('currentPagination'));
    //filling up details section
    const toDisplay = ['receipt_amount', 'comment', 'receipt_amount', 'receipt_date', 'receipt_supplier', 'receipt_vat', 'added_on', 'validated_by_manager', 'validated_by_accountant' ]    
    for (const [key, value] of Object.entries(row)) {        
        let newValue;
        (key=='receipt_date' || key=='date_added')?newValue=convertToISO(convertDate(value)):newValue=value;
        console.log('key ', key, 'value ', newValue);                
        toDisplay.includes(key)?document.getElementById(key).value = newValue:null;                
        document.getElementById('receipt_category_value').innerHTML=row.receipt_category;
        document.getElementById('receipt_currency_value').innerHTML=row.receipt_currency;
        document.getElementById('invoiceAmountExVat').value=Math.round((row.receipt_amount - row.receipt_vat)*100)/100;
    }
    //filling up items section
    fetch(apiUrl+'db/getReceiptItems', {method: 'POST', headers: {'Content-Type':'Application/json'}, credentials: 'include', body: JSON.stringify({receipt_id: receiptId})})
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
                    <td>${ row?.item_vat || 0 }</td>
                    <td>${row?.item_vat?Math.round((row.item_unit_price-row.item.vat)*100)/100:Math.round(row.item_unit_price*100)/100}</td>`
                itemsTable.querySelector('tbody').appendChild(newRow);
            });
        }
    })
    .catch((err)=>console.log('error fetching items ',err))
    //filling up the image
    const container=document.getElementById('invoiceImage');
    container.innerHTML = ""; // Clear previous content
    fetch(apiUrl+'db/getReceiptImg',{ method: 'POST', headers: {'Content-Type': 'application/json'}, body:JSON.stringify({path: row.storage_path})})
    .then((res)=> {
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
    // add event listeners to buttons
    document.getElementById('genLinkModal').addEventListener('click',()=>{
        handleGenerateLink(row.id);
        popup('Link generated and copied to clipboard');
    })
    document.getElementById('downloadModal').addEventListener('click',()=>handleDownload([row], row.id))
    document.getElementById('deleteModal').addEventListener('click',()=>handleDelete(row.id, modal))
    document.getElementById('editModal').addEventListener('click',()=>handleEdit(row))        
    document.getElementById('viewInvoicesModal').querySelectorAll('.modalChoice').forEach((el)=>el.addEventListener('click',handleModalElement));
}
