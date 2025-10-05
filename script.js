(function(){
  // Tabs interaction
  var tabs = document.querySelectorAll('.tab');
  var panels = document.querySelectorAll('.panel');
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      var id = tab.getAttribute('data-tab');
      tabs.forEach(function(t){ t.classList.remove('active'); });
      panels.forEach(function(p){ p.classList.remove('active'); });
      tab.classList.add('active');
      var panel = document.getElementById(id);
      if(panel){ panel.classList.add('active'); panel.scrollIntoView({behavior:'smooth',block:'nearest'}); }
    });
  });

  // Count-up for debrisRemaining
  var target = 28511;
  var el = document.getElementById('debrisRemaining');
  if(el){
    var start = target - 1800;
    var now = start;
    var duration = 1400; // ms
    var t0 = performance.now();
    function stepAnim(t){
      var p = Math.min(1, (t - t0)/duration);
      now = Math.round(start + (target - start) * p);
      el.textContent = now.toLocaleString('en-US');
      if(p < 1) requestAnimationFrame(stepAnim);
    }
    requestAnimationFrame(stepAnim);
  }

  // Canvas stars placeholder OR Three.js upgrade if available
  var canvas = document.getElementById('space-canvas');
  if(canvas && window.THREE){
    // Three.js 3D scene
    var renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true});
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    var controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.enablePan = false; controls.minDistance = 30; controls.maxDistance = 800;

    var light = new THREE.DirectionalLight(0xffffff, 1.0); light.position.set(100,120,80); scene.add(light);
    scene.add(new THREE.AmbientLight(0x335577, 0.5));

    // Earth sphere
    var earthGeo = new THREE.SphereGeometry(8, 48, 48);
    var earthMat = new THREE.MeshStandardMaterial({color:0x1e90ff, roughness:0.7, metalness:0.1});
    var earth = new THREE.Mesh(earthGeo, earthMat); scene.add(earth);

    // Rings for LEO/MEO/GEO
    function makeRing(r,color,inclinationRad){
      var ringGeo = new THREE.RingGeometry(r-0.2, r+0.2, 128);
      var ringMat = new THREE.MeshBasicMaterial({color:color, side:THREE.DoubleSide, transparent:true, opacity:0.45});
      var mesh = new THREE.Mesh(ringGeo, ringMat);
      // Start on the XZ plane (equatorial), then tilt around Z by inclination
      mesh.rotation.x = Math.PI/2;
      if(inclinationRad){ mesh.rotation.z = inclinationRad; }
      return mesh;
    }
    var leoR = 28, meoR = 46, geoR = 64;
    scene.add(makeRing(leoR, 0x66aaff, 0));                 // LEO (equatorial)
    scene.add(makeRing(meoR, 0x88bbff, THREE.MathUtils.degToRad(25))); // MEO (inclined)
    scene.add(makeRing(geoR, 0xaaccff, THREE.MathUtils.degToRad(-5))); // GEO (slight tilt)

    // Reference 3D plane (grid) and axes to emphasize depth
    var grid = new THREE.GridHelper(300, 30, 0x335577, 0x1b2c4f);
    grid.material.opacity = 0.25; grid.material.transparent = true; scene.add(grid);
    var axes = new THREE.AxesHelper(18); axes.position.set(0,0,0); scene.add(axes);

    // Genesis satellites in LEO
    var genesis = [];
    for(var i=0;i<6;i++){
      var sat = new THREE.Mesh(new THREE.SphereGeometry(0.9,16,16), new THREE.MeshStandardMaterial({color:0x7b5cff, emissive:0x221144, roughness:0.4}));
      sat.userData = { label:'Genesis-'+(i+1), phase: i*(Math.PI*2/6), radius: leoR };
      scene.add(sat); genesis.push(sat);
    }

    // Starfield
    var starGeo = new THREE.BufferGeometry();
    var starCnt = 800;
    var starPos = new Float32Array(starCnt*3);
    for(var s=0;s<starCnt;s++){ starPos[s*3] = (Math.random()-0.5)*1200; starPos[s*3+1] = (Math.random()-0.5)*1200; starPos[s*3+2] = (Math.random()-0.5)*1200; }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos,3));
    var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({color:0x9fbfff,size:1, sizeAttenuation:true}));
    scene.add(stars);

    function resize(){
      var w = canvas.clientWidth, h = canvas.clientHeight; if(w===0||h===0){return;}
      renderer.setSize(w,h,false); camera.aspect = w/h; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();
    camera.position.set(130,80,140); controls.update();

    var clock = new THREE.Clock();
    function animate(){
      var t = clock.getElapsedTime();
      earth.rotation.y += 0.003;
      genesis.forEach(function(s,i){
        var ang = t*0.3 + s.userData.phase;
        s.position.set(Math.cos(ang)*s.userData.radius, 0, Math.sin(ang)*s.userData.radius);
      });
      controls.update();
      renderer.render(scene,camera);
      requestAnimationFrame(animate);
    }
    animate();
  } else if(canvas){
    var ctx = canvas.getContext('2d');
    function resize(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
    window.addEventListener('resize', resize);
    function rand(n){ return Math.random()*n; }
    var stars = [];
    function initStars(){
      stars = [];
      var count = 220;
      for(var i=0;i<count;i++){
        stars.push({x:rand(canvas.width), y:rand(canvas.height), r:Math.random()*1.2, a:0.2+Math.random()*0.8});
      }
    }
    var orbits;
    function setupOrbits(){
      var cx = canvas.width/2, cy = canvas.height/2;
      var baseR = Math.min(cx,cy) - 20;
      // three orbital bands: LEO, MEO, GEO (scaled)
      orbits = [
        { name:'LEO',  rx: baseR*0.35*1.3, ry: baseR*0.35, color:'rgba(80,160,255,0.45)' },
        { name:'MEO',  rx: baseR*0.58*1.3, ry: baseR*0.58, color:'rgba(120,180,255,0.35)' },
        { name:'GEO',  rx: baseR*0.80*1.3, ry: baseR*0.80, color:'rgba(160,200,255,0.25)' }
      ];
      // LEO stations: Genesis-1..6 distributed around LEO
      orbits[0].stations = Array.from({length:6}).map(function(_,i){
        return { label: 'Genesis-' + (i+1), phase: i*(Math.PI*2/6) };
      });
    }
    function draw(t){
      if(!ctx) return;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // background stars twinkle
      for(var i=0;i<stars.length;i++){
        var s = stars[i];
        var tw = s.a + Math.sin((t/800)+(i*0.7))*0.15;
        ctx.fillStyle = 'rgba(150,180,255,'+Math.max(0,Math.min(1,tw))+')';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
      }
      // orbits LEO / MEO / GEO
      ctx.lineWidth = 1;
      var cx = canvas.width/2, cy = canvas.height/2;
      if(!orbits) setupOrbits();
      orbits.forEach(function(o,idx){
        ctx.strokeStyle = o.color;
        ctx.beginPath(); ctx.ellipse(cx, cy, o.rx, o.ry, 0, 0, Math.PI*2); ctx.stroke();
        // label
        ctx.fillStyle = 'rgba(180,210,255,0.7)';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(o.name, cx + o.rx + 22, cy - 6 + idx*14);
      });
      ctx.fillStyle = '#1e90ff';
      ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.fill();
      var tt = t/1000;
      // LEO stations: Genesis-1..6 moving slowly
      if(orbits && orbits[0] && orbits[0].stations){
        ctx.fillStyle = '#7b5cff';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        orbits[0].stations.forEach(function(s){
          var ang = tt*0.4 + s.phase;
          var x = cx + Math.cos(ang)*orbits[0].rx;
          var y = cy + Math.sin(ang)*orbits[0].ry;
          ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
          ctx.fillStyle = 'rgba(200,220,255,0.9)';
          ctx.fillText(s.label, x + 6, y - 6);
          ctx.fillStyle = '#7b5cff';
        });
      }
      requestAnimationFrame(draw);
    }
    function start(){ resize(); initStars(); setupOrbits(); requestAnimationFrame(draw); }
    start();
  }

  // On-scroll bar animations
  var observer;
  if('IntersectionObserver' in window){
    observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var span = entry.target;
          var targetPct = Number(span.getAttribute('data-target') || '0');
          span.style.width = targetPct + '%';
          observer.unobserve(span);
        }
      });
    }, {threshold:0.3});
    document.querySelectorAll('.progress span,[class^="impact-"] span,.impact-bar span').forEach(function(s){
      observer.observe(s);
    });
  } else {
    document.querySelectorAll('.progress span,.impact-bar span').forEach(function(s){
      var targetPct2 = Number(s.getAttribute('data-target') || '0');
      s.style.width = targetPct2 + '%';
    });
  }

  // Reveal-on-scroll
  var revealObs;
  var reveals = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    revealObs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('show');
          revealObs.unobserve(entry.target);
        }
      });
    }, {threshold:0.15});
    reveals.forEach(function(r){ revealObs.observe(r); });
  } else {
    reveals.forEach(function(r){ r.classList.add('show'); });
  }

  // Parallax hero decorative orbs using mouse move
  var header = document.querySelector('.site-header');
  if(header){
    header.addEventListener('mousemove', function(e){
      var r = header.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      header.style.setProperty('--rx', (x*100)+'%');
      header.style.setProperty('--ry', (y*100)+'%');
    });
  }

  // Button ripple positions (CSS reads --rx/--ry)
  document.querySelectorAll('.btn').forEach(function(b){
    b.addEventListener('pointerdown', function(e){
      var rect = b.getBoundingClientRect();
      b.style.setProperty('--rx', (e.clientX-rect.left)+'px');
      b.style.setProperty('--ry', (e.clientY-rect.top)+'px');
    });
  });
})();


