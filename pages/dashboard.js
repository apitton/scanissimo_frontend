export function init() {
    console.log('dashboard');
    const invoiceViewMode = document.getElementById('invoiceViewMode');
    ['viewReceipts','addReceipt', 'genStatement', 'viewStatements'].forEach((el)=>document.getElementById(el).addEventListener('click',()=>invoiceViewMode.dataset.invoiceViewMode="client"));    
    fetch(apiUrl+'auth/session',{method: 'GET', headers: {'Content-Type': 'Application/json'}})
    .then((reply)=>reply.json())
    .then((response)=>{
        console.log(response);        
        if (response.user.is_accountant) {
            document.getElementById('accountant').classList.remove('restricted-disable');
            ['viewCustomerReceipts','genCustomerStatement', 'addCustomerReceipt'].forEach((el)=>document.getElementById(el).addEventListener('click',()=>invoiceViewMode.dataset.invoiceViewMode = "accountant"));
        }
        if (response.user.is_accountant && !response.user.is_regular) {
            ['viewReceipts','addReceipt', 'genStatement', 'viewStatements'].forEach((el)=>{
                document.getElementById(el).classList.add('disabled') });
        }
        if (response.user.is_manager) {
            document.getElementById('manager').classList.remove('restricted-disable');
            ['viewTeamReceipts','teamStatement'].forEach((el)=>document.getElementById(el).addEventListener('click',()=>invoiceViewMode.dataset.invoiceViewMode = "manager"));
        }     
        if (response.user.is_org_admin) {
            document.getElementById('organisation').classList.remove('restricted-disable');
            ['viewOrganisationReceipts','genOrgStatement', 'addOrganisationReceipt'].forEach((el)=>document.getElementById(el).addEventListener('click',()=>invoiceViewMode.dataset.invoiceViewMode="organisation"));
        }
        linksEventListeners('button[data-link]:not(.disabled)', 'dashboard.html');})
    .catch((err)=>console.log('error fetching session ',err));
     }