const DATA_URL="puzzles.json";
const DIFFICULTIES=["easy","medium","hard"];
const tz="America/Edmonton";

let puzzles=[], todaySet=[], currentIndex=0, results=[];
let streakData={ current:0, best:0, lastDate:null };
let pendingCallback=null;

const optEl=document.getElementById("options");
const endScreen=document.getElementById("endScreen");
const summaryEl=document.getElementById("summary");
const shareBtn=document.getElementById("shareBtn");
const overlay=document.getElementById("feedbackOverlay");
const overlaySymbol=overlay.querySelector(".symbol");
const overlayText=overlay.querySelector(".text");
const overlayExp=overlay.querySelector(".explanation");
const continueBtn=document.getElementById("continueBtn");
const footerInfo=document.getElementById("footerInfo");
const progressEl=document.getElementById("progress");

function loadStreak(){const s=localStorage.getItem("altera_streak");if(s){streakData=JSON.parse(s);}}
function saveStreak(){localStorage.setItem("altera_streak",JSON.stringify(streakData));}
function toYMD(date,tz){const z=new Date(date.toLocaleString('en-US',{timeZone:tz}));return `${z.getFullYear()}${String(z.getMonth()+1).padStart(2,'0')}${String(z.getDate()).padStart(2,'0')}`;}
function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}}
function seededPick(rng,arr){return arr[Math.floor(rng()*arr.length)]}
function shuffleArray(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

loadStreak();
loadData();

async function loadData(){
  const res=await fetch(DATA_URL);
  const data=await res.json();
  puzzles=data.themes;
  setupDaily();
}

function setupDaily(){
  const seed=toYMD(new Date(),tz);
  const rng=mulberry32(Number(seed));
  todaySet=DIFFICULTIES.map(d=>seededPick(rng,puzzles.filter(p=>p.difficulty===d)));
  updateFooter(seed);
  startPuzzle(0);
}

function updateFooter(seed){
  const today=new Date().toLocaleDateString('en-CA',{timeZone:tz});
  footerInfo.innerHTML=`Seed: ${seed}<br>Date: ${today}<br>🔥 Streak: ${streakData.current} (Best: ${streakData.best})`;
}

function startPuzzle(i){
  currentIndex=i;
  progressEl.textContent=`Puzzle ${i+1}/3`;

  const p=todaySet[i];
  const shuffled=shuffleArray([...p.items]);

  optEl.innerHTML="";
  shuffled.forEach((item)=>{
    const tile=document.createElement("div");
    tile.className="option lvl"+(i+1);
    if(i===2){ tile.style.setProperty("--delay",`${Math.random()*2}s`); }
    tile.innerHTML=`<span>${item}</span>`;
    tile.onclick=()=>choose(tile,item,p);
    optEl.appendChild(tile);
  });
}

function choose(tile,choice,puzzle){
  if(navigator.vibrate) navigator.vibrate(50);
  Array.from(optEl.children).forEach(c=>c.onclick=null);
  const correct=(choice===puzzle.answer);
  if(correct){
    results.push("✅");
    showOverlay(true,puzzle.explanation,()=>{
      if(currentIndex<2){startPuzzle(currentIndex+1);}
      else{finishGame(true);}
    });
  }else{
    results.push("❌");
    showOverlay(false,puzzle.explanation,()=>finishGame(false));
  }
}

function showOverlay(correct,explanation,cb){
  overlay.style.display="flex";
  overlay.className=correct?"correct":"wrong";
  overlaySymbol.textContent=correct?"✓":"✕";
  overlayText.textContent=correct?"Correct":"Game Over";
  overlayExp.textContent=explanation;
  pendingCallback=cb;
}
continueBtn.onclick=()=>{overlay.style.display="none";if(pendingCallback){pendingCallback();pendingCallback=null;}};

function finishGame(won){
  const todaySeed=toYMD(new Date(),tz);
  if(streakData.lastDate!==todaySeed){
    if(won){
      const yesterday=toYMD(new Date(Date.now()-86400000),tz);
      streakData.current=(streakData.lastDate===yesterday)?(streakData.current+1):1;
      streakData.best=Math.max(streakData.best,streakData.current);
    }else{streakData.current=0;}
    streakData.lastDate=todaySeed;saveStreak();
  }
  updateFooter(todaySeed);

  optEl.innerHTML="";
  endScreen.classList.remove("hidden");
  summaryEl.textContent=`${results.join(" ")} (${won?"Cleared all!":"Game over"})`;
  shareBtn.classList.remove("hidden"); // show only now
}

shareBtn.onclick=()=>{
  const d=new Date().toLocaleDateString('en-CA',{timeZone:tz});
  const text=`Altera ${d}\n${results.join(" ")}\n🔥 Streak: ${streakData.current}\nPlay: (your game URL)`;
  if(navigator.share){navigator.share({title:"Altera",text});}
  else{navigator.clipboard.writeText(text).then(()=>alert("Results copied!"));}
};