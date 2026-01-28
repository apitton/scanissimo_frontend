import { routeNextPage } from "./pages/login.js";
let nbRuns = 0;
let logruns=[];
const nonLoginPages=['/pages/frontPage.html', '/pages/signup.html', '/pages/login.html', '/pages/mfa.html', '/pages/signupStaff.html', 'pages/acceptInviteFromAcc.html'];
console.log('script loaded');
//const links_start = document.querySelectorAll('a')
//console.log('links ',links);
document.addEventListener('DOMContentLoaded',()=>{
  window.history.forward();
  linksEventListeners('span.link', 'index.html');
  linksEventListeners('img.link', 'index.html');
  let params = new URLSearchParams(document.location.search);
  let page=params.get('page') || '/pages/frontPage.html';
  const entries = JSON.stringify(Object.fromEntries(params.entries()));
  console.log(entries);
  document.getElementById('mainSection').dataset.data=entries;
  let location = window.location;
  let apiUrl;
  console.log(location.host);
  if (location.host.search('localhost')) {
    apiUrl = '';
  } else {
    apiUrl = 'https://smct2d7vjb.execute-api.eu-west-2.amazonaws.com/';
  }
  if (nonLoginPages.includes(page)) {
    console.log('nonlogin ');
    return loadPageAndScript(page); }
  return routeNextPage(page);
  //return loadPageAndScript(page);
  //.then((eventListeners)=>{return eventListeners});     
});

async function linksEventListeners(selector, pageName) {
  nbRuns+=1;
  logruns.push({nbRuns: nbRuns, page: pageName});
  console.log('logruns ',logruns);
  //document.addEventListener("click", blockClicks, true);
  const links = document.querySelectorAll(selector)
  console.log('links ',links);
  links.forEach((link)=>{
      console.log('adding event listener for', link.dataset.link, 'nbruns ', nbRuns, 'from', pageName);
      link.addEventListener('click', handleLinkClick);
          } );
      
    //document.removeEventListener("click", blockClicks, true);
    return 'done';}

export function handleLinkClick(e) {
  document.querySelector('.link.active')?.classList.remove('active');
  e.target.classList.add('active');          
  console.log("clicked ", e.target.id || e.target);
  const pageLink = e.target.dataset.link //link.dataset.link;
  if (nonLoginPages.includes(pageLink)) return loadPageAndScript(pageLink);
  return routeNextPage(pageLink);
}

export async function loadPageAndScript(pageLink) {
  let pageName;
  return fetch('/auth/session', {method: 'GET', credentials: 'include', headers: {'Content-Type':'Application/json' }})
  .then((reply)=>reply.json()).then((response)=>{
    console.log('session', response);
    window.user=response.user;
    if (!response?.authenticated && !nonLoginPages.includes(pageLink)) {
      console.log('pageLink test ', pageLink);
      pageLink='/pages/login.html'; 
      popup('You need to login before you can access this page');
    }
    if (response?.authenticated) toogleLogin('login');
    console.log('pagelink ', pageLink);
    return fetch(pageLink)
    .then(fetchHref=>{
      if (fetchHref.ok) {
        return fetchHref.text()
      } else {
        popup('The page does not exist, you are being redirected to the front page.');        
        return fetch('/pages/frontPage.html').then((fetchHref)=>fetchHref.text());
      } })
    .catch((err)=>{
      console.log('error ',err);
      return fetch('/pages/frontPage.html').then((fetchHref)=>fetchHref.text())})  })       
  .then((res)=> {                    
      document.getElementById('mainSection').innerHTML='';
      document.getElementById('mainSection').innerHTML=res;           
      pageName = pageLink.split('.html')[0];
      //const module = await import(`${pageName}.js?${Date.now()}`);
      return import(`${pageName}.js?${Date.now()}`)} ) 
    .then((module)=>{
      if (typeof module.init === "function") {
        console.log('loading module ',module);
        return module.init();   // Run the page's code
        } })
    .then((result)=>{              
      console.log('script loaded ');
      //popup('page loaded');
      return linksEventListeners('#mainSection span.link, #alert span.link', pageName);
      })
    .catch((err) => {
      console.error(`No JS module for the page ${pageLink}`, err);
    }) } 
    
document.getElementById('logout').addEventListener('click',logout);

async function logout(e) {
  console.log('clicked');
  e.preventDefault();
  manageModalButtons(['yesButton', 'noButton']);

  const modalText = document.getElementById('infoText');   
  
  modalText.innerHTML='Would you like to log out?';
  const infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
  infoModal.show();

  document.getElementById('yesButton').addEventListener('click',()=>{
    fetch('auth/logout', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}})
    .then((reply)=>reply.json())
    .then((response)=> {
      if (response.ok) {
        infoModal.dispose();
        toogleLogin('logout');
        popup('Logged out successfully')
        return loadPageAndScript('/pages/login.html');
      }})
    .catch((err)=> {
      infoModal.dispose();
      console.log('problem logging out ',err)})
  })
  document.getElementById('noButton').addEventListener('click',()=>{
    infoModal.dispose();    
  })
}

//loads script (if exists) for each page. the script has to have the same name as the page and be on the same path
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    try {
        let res;
        fetch(src, {method: 'HEAD'})
        .then((result)=>{
          res=result
          return res.ok;})
        
    } catch (err) {
        return false;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

function blockClicks(e) {
    // Check if clicked element is a link
    if (e.target.closest("a")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        // Optionally show "Loading..."
    }
}
export function popup(text) {
    const modalText = document.getElementById('infoText');   
    manageModalButtons(['closeButton']);
    modalText.innerHTML=text;
    const infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
    infoModal.show();
    //document.getElementById('closeButton').addEventListener('click', () => infoModal.dispose())
}
export function manageModalButtons(buttons) { //expecting an array  
    buttons.includes('yesButton')?document.getElementById('yesButton').classList.remove('restricted-disable'):document.getElementById('yesButton').classList.add('restricted-disable');
    buttons.includes('noButton')?document.getElementById('noButton').classList.remove('restricted-disable'):document.getElementById('noButton').classList.add('restricted-disable');
    buttons.includes('closeButton')?document.getElementById('closeButton').classList.remove('restricted-disable'):document.getElementById('closeButton').classList.add('restricted-disable');
}

export function restoreFooter() {
    document.getElementById('modalInvoiceInfo').innerHTML='';
    document.getElementById('modalInvoiceYes').classList.add('restricted-disable');
    document.getElementById('modalInvoiceNo').classList.add('restricted-disable');
    document.getElementById('modalInvoiceCancel').classList.add('restricted-disable');
    document.getElementById('modalInvoiceSave').classList.add('restricted-disable');
    document.getElementById('modalInvoiceInfo').classList.remove('text-alert');
}

window.linksEventListeners=linksEventListeners;
//window.loadPageAndScript=loadPageAndScript;
window.nbRuns;
export let filesToUpload = [];  //variable used for addReceipts
export let statements=[]; //variable used for genStatements

export function toogleLogin(direction) {
  if (direction == 'login') {
  document.getElementById('logout').classList.remove('restricted-disable');
  document.getElementById('signup').classList.add('restricted-disable');
  document.getElementById('login').classList.add('restricted-disable');
  } else {
    document.getElementById('logout').classList.add('restricted-disable');
    document.getElementById('signup').classList.remove('restricted-disable');
    document.getElementById('login').classList.remove('restricted-disable');
  }
}

export function capitalize(string='') {  
  if (!string) return '';
  let result = string.charAt(0).toUpperCase();
  string.length>1?result+=string.slice(1):null;
  return result;
}