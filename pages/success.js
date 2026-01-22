import { loadPageAndScript } from "../script.js";
export function init() {
     let params = new URLSearchParams(document.location.search);
     let session_id = params.get('session_id');
     setTimeout(()=>{
        loadPageAndScript('/pages/dashboard.html');
     },3000);
}