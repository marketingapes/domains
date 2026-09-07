(()=>{
'use strict';
const board=document.getElementById('snake-board');if(!board)return;
const ctx=board.getContext('2d');if(!ctx)return;
const start=document.getElementById('snake-start'),pause=document.getElementById('snake-pause'),message=document.getElementById('snake-message'),scoreEl=document.getElementById('snake-score'),bestEl=document.getElementById('snake-best');
const size=20,cell=20,vectors={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
let snake,food,dir,next,score=0,best=0,state='ready',timer=null,queued=false;
try{best=Math.max(0,Number(localStorage.getItem('kg-snake-best'))||0);}catch{}bestEl.textContent=best;
function event(name){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:name,tenant_id:'KG',game:'snake',score});}
function placeFood(){const free=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!snake.some(p=>p[0]===x&&p[1]===y))free.push([x,y]);return free.length?free[Math.floor(Math.random()*free.length)]:null;}
function draw(){ctx.fillStyle='#102342';ctx.fillRect(0,0,400,400);ctx.strokeStyle='#ffffff08';for(let n=0;n<=400;n+=cell){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n,400);ctx.moveTo(0,n);ctx.lineTo(400,n);ctx.stroke();}if(food){ctx.fillStyle='#ffaf60';ctx.fillRect(food[0]*cell+4,food[1]*cell+4,12,12);}snake.forEach((p,i)=>{ctx.fillStyle=i===0?'#b9e9ff':'#438dff';ctx.fillRect(p[0]*cell+1,p[1]*cell+1,18,18);});if(state!=='running'){ctx.fillStyle='#102342b8';ctx.fillRect(0,0,400,400);ctx.fillStyle='white';ctx.textAlign='center';ctx.font='bold 25px sans-serif';ctx.fillText(state==='ready'?'Ready to play?':state==='paused'?'Paused':state==='won'?'You filled the board!':'Nice run.',200,190);ctx.font='14px sans-serif';ctx.fillText(state==='ready'?'Press Start game':state==='paused'?'Press Resume to continue':'Press Play again',200,218);}}
function reset(){snake=[[8,10],[7,10],[6,10]];dir=[1,0];next=dir;queued=false;score=0;scoreEl.textContent=0;food=placeFood();}
function finish(won=false){clearInterval(timer);state=won?'won':'over';pause.disabled=true;start.textContent='Play again';message.textContent=won?'You won! The board is full.':'Game over. Score: '+score+'. Try another run.';event('ee_game_complete');draw();}
function tick(){dir=next;queued=false;const head=[snake[0][0]+dir[0],snake[0][1]+dir[1]];const eat=food&&head[0]===food[0]&&head[1]===food[1];const body=eat?snake:snake.slice(0,-1);if(head.some(n=>n<0||n>=size)||body.some(p=>p[0]===head[0]&&p[1]===head[1])){finish();return;}snake.unshift(head);if(eat){score+=10;scoreEl.textContent=score;if(score>best){best=score;bestEl.textContent=best;try{localStorage.setItem('kg-snake-best',String(best));}catch{}}food=placeFood();if(!food){finish(true);return;}}else snake.pop();draw();}
function turn(key){if(state!=='running'||queued)return;const v=vectors[key];if(!v||v[0]===-dir[0]&&v[1]===-dir[1])return;next=v;queued=true;}
function toggle(){if(state==='running'){state='paused';clearInterval(timer);pause.textContent='Resume';message.textContent='Paused. Take your time.';}else if(state==='paused'){state='running';pause.textContent='Pause';message.textContent='Collect orange squares. Avoid walls and your tail.';timer=setInterval(tick,140);}draw();}
start.addEventListener('click',()=>{clearInterval(timer);reset();state='running';start.textContent='Restart';pause.disabled=false;pause.textContent='Pause';message.textContent='Collect orange squares. Avoid walls and your tail.';event('ee_game_start');draw();timer=setInterval(tick,140);board.focus({preventScroll:true});});
pause.addEventListener('click',toggle);
const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
document.getElementById('play').addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select,a'))return;if(keys[e.key]&&(state==='running'||state==='paused')){e.preventDefault();turn(keys[e.key]);}if(e.code==='Space'&&e.target===board){e.preventDefault();toggle();}});
document.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',()=>turn(b.dataset.direction)));
let touch=null;board.addEventListener('pointerdown',e=>{touch=[e.clientX,e.clientY];});board.addEventListener('pointerup',e=>{if(!touch)return;const x=e.clientX-touch[0],y=e.clientY-touch[1];touch=null;if(Math.max(Math.abs(x),Math.abs(y))<12)return;turn(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'down':'up');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')toggle();});
reset();draw();
})();
