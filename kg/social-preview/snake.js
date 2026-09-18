(()=>{
'use strict';
const board=document.getElementById('snake-board');if(!board)return;
const ctx=board.getContext('2d');if(!ctx)return;
const start=document.getElementById('snake-start'),pause=document.getElementById('snake-pause'),message=document.getElementById('snake-message'),scoreEl=document.getElementById('snake-score'),bestEl=document.getElementById('snake-best');
const play=document.getElementById('play'),fullscreen=document.getElementById('snake-fullscreen');
const size=20,cell=20,vectors={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
let snake,food,dir,next,score=0,best=0,state='ready',timer=null,queued=false;
try{best=Math.max(0,Number(localStorage.getItem('kg-snake-best'))||0);}catch{}bestEl.textContent=best;
function event(name){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name,tenant_id:'KG',game:'snake',score});}
function placeFood(){const free=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!snake.some(p=>p[0]===x&&p[1]===y))free.push([x,y]);return free.length?free[Math.floor(Math.random()*free.length)]:null;}
function draw(){ctx.fillStyle='#2d2118';ctx.fillRect(0,0,400,400);ctx.strokeStyle='#ffffff08';for(let n=0;n<=400;n+=cell){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,400);ctx.moveTo(0,n);ctx.lineTo(400,n);ctx.stroke();}if(food){ctx.fillStyle='#ffaf60';ctx.fillRect(food[0]*cell+4,food[1]*cell+4,12,12);}snake.forEach((p,i)=>{ctx.fillStyle=i===0?'#ffe0a0':'#ce9445';ctx.fillRect(p[0]*cell+1,p[1]*cell+1,18,18);});if(state!=='running'){ctx.fillStyle='#2d2118b8';ctx.fillRect(0,0,400,400);ctx.fillStyle='white';ctx.textAlign='center';ctx.font='bold 25px sans-serif';ctx.fillText(state==='ready'?'Ready to play?':state==='paused'?'Paused':state==='won'?'You filled the board!':'Nice run.',200,190);ctx.font='14px sans-serif';ctx.fillText(state==='ready'?'Press Start game':state==='paused'?'Press Resume to continue':'Press Play again',200,218);}}
function reset(){snake=[[8,10],[7,10],[6,10]];dir=[1,0];next=dir;queued=false;score=0;scoreEl.textContent=0;food=placeFood();}
function finish(won=false){clearInterval(timer);state=won?'won':'over';pause.disabled=true;start.textContent='Play again';message.textContent=won?'You won! The board is full.':'Game over. Score: '+score+'. Try another run.';event('ee_game_complete');draw();}
function tick(){dir=next;queued=false;const head=[snake[0][0]+dir[0],snake[0][1]+dir[1]];const eat=food&&head[0]===food[0]&&head[1]===food[1];const body=eat?snake:snake.slice(0,-1);if(head.some(n=>n<0||n>=size)||body.some(p=>p[0]===head[0]&&p[1]===head[1])){finish();return;}snake.unshift(head);if(eat){score+=10;scoreEl.textContent=score;if(score>best){best=score;bestEl.textContent=best;try{localStorage.setItem('kg-snake-best',String(best));}catch{}}food=placeFood();if(!food){finish(true);return;}}else snake.pop();draw();}
function turn(key){if(state!=='running'||queued)return;const v=vectors[key];if(!v||v[0]===-dir[0]&&v[1]===-dir[1])return;next=v;queued=true;}
function toggle(){if(state==='running'){state='paused';clearInterval(timer);pause.textContent='Resume';message.textContent='Paused. Take your time.';}else if(state==='paused'){state='running';pause.textContent='Pause';message.textContent='Collect orange squares. Avoid walls and your tail.';timer=setInterval(tick,280);}draw();}
function nativeFullscreen(){return document.fullscreenElement===play||document.webkitFullscreenElement===play;}
function fullscreenActive(){return nativeFullscreen()||play.classList.contains('snake-fullscreen-fallback');}
function syncFullscreen(){const active=fullscreenActive();play.classList.toggle('snake-fullscreen-active',active);document.body.classList.toggle('snake-game-locked',play.classList.contains('snake-fullscreen-fallback'));if(fullscreen){fullscreen.textContent=active?'Exit full screen':'Full screen';fullscreen.setAttribute('aria-pressed',String(active));}}
async function toggleFullscreen(){if(!fullscreen)return;if(!fullscreenActive()){const request=play.requestFullscreen||play.webkitRequestFullscreen;if(request){try{await request.call(play);}catch{play.classList.add('snake-fullscreen-fallback');}}else play.classList.add('snake-fullscreen-fallback');syncFullscreen();event('ee_game_fullscreen_enter');}else{if(nativeFullscreen()){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit){try{await exit.call(document);}catch{}}}play.classList.remove('snake-fullscreen-fallback');syncFullscreen();event('ee_game_fullscreen_exit');}board.focus({preventScroll:true});}
start.addEventListener('click',()=>{clearInterval(timer);reset();state='running';start.textContent='Restart';pause.disabled=false;pause.textContent='Pause';message.textContent='Collect orange squares. Avoid walls and your tail.';event('ee_game_start');draw();timer=setInterval(tick,280);board.focus({preventScroll:true});});
pause.addEventListener('click',toggle);
if(fullscreen)fullscreen.addEventListener('click',toggleFullscreen);
document.addEventListener('fullscreenchange',syncFullscreen);document.addEventListener('webkitfullscreenchange',syncFullscreen);
const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
play.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select,a'))return;if(e.key==='Escape'&&play.classList.contains('snake-fullscreen-fallback')){e.preventDefault();play.classList.remove('snake-fullscreen-fallback');syncFullscreen();event('ee_game_fullscreen_exit');return;}if(keys[e.key]&&(state==='running'||state==='paused')){e.preventDefault();turn(keys[e.key]);}if(e.code==='Space'&&e.target===board){e.preventDefault();toggle();}});
document.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',()=>turn(b.dataset.direction)));
let touch=null;
board.addEventListener('pointerdown',e=>{if(state!=='running')return;touch=[e.clientX,e.clientY];if(board.setPointerCapture)try{board.setPointerCapture(e.pointerId);}catch{}});
board.addEventListener('pointermove',e=>{if(!touch||state!=='running')return;const x=e.clientX-touch[0],y=e.clientY-touch[1];if(Math.max(Math.abs(x),Math.abs(y))<18)return;e.preventDefault();turn(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'down':'up');touch=[e.clientX,e.clientY];});
function endTouch(e){touch=null;if(board.releasePointerCapture&&board.hasPointerCapture&&board.hasPointerCapture(e.pointerId))try{board.releasePointerCapture(e.pointerId);}catch{}}
board.addEventListener('pointerup',endTouch);board.addEventListener('pointercancel',endTouch);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')toggle();});
reset();draw();
})();
