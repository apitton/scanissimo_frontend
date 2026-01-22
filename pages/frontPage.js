export function init() {
    console.log('front page');
    const carouselButton = document.querySelector('.carousel-control-next');
    setTimeout(()=>{
        console.log('clicked!');
        carouselButton.click(); }, 6000)
}