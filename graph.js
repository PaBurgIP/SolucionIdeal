/* Author: Pablo Ib | Last modified by: Pablo Ib */
(function (root) {
  'use strict';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const initialCamera = () => ({yaw:-0.65, pitch:0.42, zoom:1, panX:0, panY:0});
  function geometry(state, result) {
    return {extents:result.weights.slice(), ideal:result.weightedIdeal.slice(),
      antiIdeal:result.weightedAntiIdeal.slice(), points:result.weighted.map(row => row.slice())};
  }
  function project(point, extents, camera) {
    const [x,y,z] = point.map((value,j) => value - extents[j] / 2);
    const u = x * Math.cos(camera.yaw) - z * Math.sin(camera.yaw);
    const depth = x * Math.sin(camera.yaw) + z * Math.cos(camera.yaw);
    const v = y * Math.cos(camera.pitch) - depth * Math.sin(camera.pitch);
    const scale = 245 * camera.zoom / Math.max(...extents, 0.01);
    return [340 + u * scale + camera.panX, 215 - v * scale + camera.panY, y * Math.sin(camera.pitch) + depth * Math.cos(camera.pitch)];
  }
  class Chart {
    constructor(svg, options = {}) {
      this.svg = svg; this.content = svg.querySelector('#scene-content');
      this.camera = initialCamera(); this.options = options; this.pointers = new Map();
      this.lastGesture = null; this.dragged = false;
      svg.addEventListener('pointerdown', event => this.pointerDown(event));
      svg.addEventListener('pointermove', event => this.pointerMove(event));
      ['pointerup','pointercancel','lostpointercapture'].forEach(type => svg.addEventListener(type, event => this.pointerUp(event)));
      svg.addEventListener('wheel', event => {
        event.preventDefault(); const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 440 : 1;
        this.zoom(Math.exp(-event.deltaY * unit * 0.0015));
      }, {passive:false});
      svg.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_','Home'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home') this.reset();
        else if (['+','='].includes(event.key)) this.zoom(1.2);
        else if (['-','_'].includes(event.key)) this.zoom(1/1.2);
        else if (event.shiftKey) {
          this.camera.panX += event.key === 'ArrowLeft' ? -18 : event.key === 'ArrowRight' ? 18 : 0;
          this.camera.panY += event.key === 'ArrowUp' ? -18 : event.key === 'ArrowDown' ? 18 : 0; this.draw();
        } else this.orbit(event.key === 'ArrowLeft' ? -.16 : event.key === 'ArrowRight' ? .16 : 0, event.key === 'ArrowUp' ? .12 : event.key === 'ArrowDown' ? -.12 : 0);
      });
      svg.addEventListener('dblclick', () => this.reset());
      svg.addEventListener('click', event => {
        const point = event.target.closest('[data-point]');
        if (point && !this.dragged) options.onSelect?.(Number(point.dataset.point));
      });
    }
    update(state, result, selected = null) { this.state = state; this.result = result; this.selected = selected; this.draw(); }
    reset() { this.camera = initialCamera(); this.draw(); }
    orbit(yaw, pitch = 0) { this.camera.yaw += yaw; this.camera.pitch = clamp(this.camera.pitch + pitch,-1.35,1.35); this.draw(); }
    zoom(factor) { this.camera.zoom = clamp(this.camera.zoom * factor,.5,2.8); this.draw(); }
    screenScale() { const rect=this.svg.getBoundingClientRect(); return [680/(rect.width||680),440/(rect.height||440)]; }
    gesture() {
      const points = [...this.pointers.values()]; if (points.length < 2) return null;
      return {distance:Math.max(1,Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)), x:(points[0].x+points[1].x)/2, y:(points[0].y+points[1].y)/2};
    }
    pointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      this.lastGesture = this.gesture(); this.dragged = false; this.svg.classList.add('dragging');
      try { this.svg.setPointerCapture?.(event.pointerId); } catch { /* Synthetic events and older hosts may not support capture. */ }
    }
    pointerMove(event) {
      const previous = this.pointers.get(event.pointerId); if (!previous) return;
      const dx=event.clientX-previous.x, dy=event.clientY-previous.y;
      if (!dx && !dy) return;
      this.dragged = true; this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      const [sx,sy]=this.screenScale(); const gesture=this.gesture();
      if (gesture && this.lastGesture) {
        this.camera.zoom=clamp(this.camera.zoom*gesture.distance/this.lastGesture.distance,.5,2.8);
        this.camera.panX+=(gesture.x-this.lastGesture.x)*sx; this.camera.panY+=(gesture.y-this.lastGesture.y)*sy;
      } else if (event.shiftKey) { this.camera.panX+=dx*sx; this.camera.panY+=dy*sy; }
      else { this.camera.yaw+=dx*.008; this.camera.pitch=clamp(this.camera.pitch+dy*.007,-1.35,1.35); }
      this.lastGesture=gesture; this.draw();
    }
    pointerUp(event) { this.pointers.delete(event.pointerId); this.lastGesture=this.gesture(); if (!this.pointers.size) this.svg.classList.remove('dragging'); }
    draw() {
      if (!this.result) return;
      this.options.onView?.(this.camera);
      if (!this.result.valid) { this.content.innerHTML='<text x="340" y="215" text-anchor="middle" class="scene-empty">Activa al menos un peso para ver el espacio 3D.</text>'; return; }
      const {extents,ideal,antiIdeal,points}=geometry(this.state,this.result);
      const p = point => project(point,extents,this.camera);
      const line = (a,b,color='#d9e2d6',width=1,dash='') => {
        const u=p(a),v=p(b);
        return `<line x1="${u[0]}" y1="${u[1]}" x2="${v[0]}" y2="${v[1]}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} vector-effect="non-scaling-stroke"/>`;
      };
      const origin=[0,0,0]; let out='';
      for(let j=0;j<3;j++) {
        const axes=[0,1,2].filter(k=>k!==j);
        for(let tick=0;tick<=5;tick++) {
          const a=[0,0,0],b=[0,0,0]; a[axes[0]]=b[axes[0]]=extents[axes[0]]*tick/5; b[axes[1]]=extents[axes[1]];
          out+=line(a,b,'#e5ece0');
          const c=[0,0,0],d=[0,0,0]; c[axes[1]]=d[axes[1]]=extents[axes[1]]*tick/5; d[axes[0]]=extents[axes[0]];
          out+=line(c,d,'#e5ece0');
        }
      }
      // All twelve box edges, independent of viewing angle.
      for(let j=0;j<3;j++) for(let a=0;a<=1;a++) for(let b=0;b<=1;b++) {
        const others=[0,1,2].filter(k=>k!==j),start=[0,0,0]; start[others[0]]=a*extents[others[0]]; start[others[1]]=b*extents[others[1]];
        const end=start.slice(); end[j]=extents[j]; out+=line(start,end,'#cddac8',1);
      }
      const axisColors=['#3268c4','#b76c2d','#8b5bb5'];
      extents.forEach((extent,j) => {
        const end=[0,0,0]; end[j]=extent; out+=line(origin,end,axisColors[j],2);
        if(extent<.001) return;
        const label=end.slice(); label[j]*=1.12; const q=p(label);
        const anchor=Math.abs(q[0]-340)<35 ? 'middle' : q[0]>340 ? 'start' : 'end';
        const name=this.state.criteria[j];
        const axisName=name.length>23 ? name.slice(0,22)+'…' : name;
        out+=`<text x="${q[0]}" y="${q[1]}" text-anchor="${anchor}" class="scene-axis" fill="${axisColors[j]}"><title>${escape(name)}</title>${escape(axisName)}<tspan x="${q[0]}" dy="15" class="scene-axis-note">${this.state.directions[j]==='max' ? '↑ más es mejor' : '↓ menos es mejor'}</tspan></text>`;
        const mid=end.map(x=>x*.5), m=p(mid);
        out+=`<text x="${m[0]+5}" y="${m[1]+14}" class="scene-tick">${(extent*.5).toLocaleString('es-ES',{maximumFractionDigits:3})}</text>`;
      });
      const zero=p(origin); out+=`<text x="${zero[0]-12}" y="${zero[1]+15}" class="scene-tick">0</text>`;
      const objects=this.result.rows.map((row,i)=>({row,point:points[i],name:row.name,color:row.color}));
      objects.push({point:ideal,name:'Ideal',color:'#203c36',kind:'ideal'}, {point:antiIdeal,name:'Antiideal',color:'#a86945',kind:'antiideal'});
      objects.sort((a,b)=>p(a.point)[2]-p(b.point)[2]);
      const labels=[];
      objects.forEach(object => {
        const q=p(object.point),row=object.row;
        const opacity=!row || this.selected===null || this.selected===row.index ? 1 : .25;
        // Offset labels when projected points coincide; never alter actual coordinates.
        const anchor=q[0]>490 ? 'end' : 'start',lx=q[0]+(anchor==='end' ? -14 : 14);
        let ly=q[1]-14;
        while(labels.some(label=>Math.abs(label.x-lx)<125 && Math.abs(label.y-ly)<20)) ly+=22;
        ly=clamp(ly,20,420); labels.push({x:lx,y:ly});
        const marker=row ? `<circle cx="${q[0]}" cy="${q[1]}" r="${this.selected===row.index ? 10 : 8}" fill="${object.color}" stroke="white" stroke-width="3"/>`
          : `<path d="M ${q[0]} ${q[1]-9} l 9 9 -9 9 -9 -9 Z" fill="${object.kind==='antiideal' ? '#fff5e9' : object.color}" stroke="${object.color}" stroke-width="3"/>`;
        out+=`<g ${row ? `data-point="${row.index}" class="alternative-point"` : `class="${object.kind}-point"`} opacity="${opacity}"><title>${escape(object.name)}</title>${marker}<text x="${lx}" y="${ly}" text-anchor="${anchor}" class="scene-point-label ${object.kind ? object.kind+'-label' : ''}" fill="${object.color}">${escape(object.name)}</text></g>`;
      });
      this.content.innerHTML=out;
    }
  }
  const api={Chart,geometry,project,initialCamera};
  if(typeof module!=='undefined' && module.exports) module.exports=api; else root.IdealChart=api;
})(globalThis);
