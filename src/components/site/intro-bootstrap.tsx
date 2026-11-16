/**
 * Ставит `data-intro` на `<html>` до первой отрисовки: интро не мигает
 * у повторных гостей и не показывается при `prefers-reduced-motion`.
 * Скрипт инлайновый и статичный — внешних данных в нём нет.
 */
const BOOTSTRAP = `(function(){try{var d=document.documentElement;var m=window.matchMedia("(prefers-reduced-motion: reduce)").matches;var seen=sessionStorage.getItem("vespera:intro")==="1";var landing=location.pathname==="/"||location.pathname==="";if(landing&&!m&&!seen){d.dataset.intro="play";window.scrollTo(0,0);}else{d.dataset.intro="off";}}catch(e){document.documentElement.dataset.intro="off";}})();`;

export function IntroBootstrap() {
  return <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />;
}
