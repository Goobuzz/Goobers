require([
	'goo/entities/GooRunner',
	'goo/entities/EntityUtils',
	'goo/shapes/ShapeCreator',
	'goo/renderer/Material',
	'goo/renderer/Camera',
	'goo/renderer/shaders/ShaderLib',
	'goo/renderer/bounds/BoundingBox',
	'goo/addons/ammo/AmmoSystem',
	'goo/addons/ammo/AmmoComponent',
	'goo/scripts/OrbitCamControlScript',
	'goo/math/Vector3',
	'goo/statemachine/FSMSystem',
	'goo/addons/howler/systems/HowlerSystem',
	'goo/loaders/DynamicLoader',
	'goo/util/rsvp',
	'js/AmmoFPSCamControlScript',
	'js/Shotgun',
	'js/Blood',
	'js/Zombie'
], function (
	GooRunner, EntityUtils, ShapeCreator, Material, Camera, ShaderLib, BoundingBox,
	AmmoSystem, AmmoComponent, OrbitCamControlScript, Vector3, FSMSystem, HowlerSystem,
	DynamicLoader, RSVP, AmmoFPSCamControlScript, Shotgun, Blood, Zombie
) {
	'use strict';

	function init() {
		var isChrome, isFirefox, isIE, isOpera, isSafari, isCocoonJS;
		isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
			isFirefox = typeof InstallTrigger !== 'undefined';
			isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
			isChrome = !!window.chrome && !isOpera;
			isIE = false || document.documentMode;
			isCocoonJS = navigator.appName === "Ludei CocoonJS";
		if (!(isFirefox || isChrome || isSafari || isCocoonJS || isIE === 11)) {
			alert("Sorry, but your browser is not supported.\nGoo works best in Google Chrome or Mozilla Firefox.\nYou will be redirected to a download page.");
			window.location.href = 'https://www.google.com/chrome';
		} else if (!window.WebGLRenderingContext) {
			alert("Sorry, but we could not find a WebGL rendering context.\nYou will be redirected to a troubleshooting page.");
			window.location.href = 'http://get.webgl.org/troubleshooting';
		} else {

			// Preventing brower peculiarities to mess with our control
			document.body.addEventListener('touchstart', function(event) {
				event.preventDefault();
			}, false);
			// Loading screen callback
			var progressCallback = function (handled, total) {
				var loadedPercent = (100*handled/total).toFixed();
				var loadingOverlay = document.getElementById("loadingOverlay");
				var progressBar = document.getElementById("progressBar");
				var progress = document.getElementById("progress");
				var loadingMessage = document.getElementById("loadingMessage");
				loadingOverlay.style.display = "block";
				loadingMessage.style.display = "block";
				progressBar.style.display = "block";
				progress.style.width = loadedPercent + "%";
			};

			// Create typical Goo application
			var goo = new GooRunner({
				antialias: true,
				manuallyStartGameLoop: true
			});
			var fsm = new FSMSystem(goo);
			goo.world.setSystem(fsm);
			goo.world.setSystem(new HowlerSystem());
			
			var ammoSystem = new AmmoSystem({stepFrequency:60});
			goo.world.setSystem(ammoSystem);

			var keys = new Array(127).join('0').split('').map(parseFloat); // prefill with 0s
			var keyHandler = function (e) { keys[e.keyCode] = e.type === "keydown" ? 1 : 0; }
			document.body.addEventListener('keyup', keyHandler, false);
			document.body.addEventListener('keydown', keyHandler, false);

			// The loader takes care of loading the data
			var loader = new DynamicLoader({world: goo.world,rootPath: 'res',progressCallback: progressCallback});
			var loader2 = new DynamicLoader({world: goo.world,rootPath: 'res',progressCallback: progressCallback});

			var p1 = loader.loadFromBundle('project.project', 'root.bundle', {recursive: false, preloadBinaries: true});
			var p2 = loader2.loadFromBundle('project.project', 'zombie.bundle', {recursive: false, preloadBinaries: true});
			RSVP.all([p1,p2]).then(function(configsArray) {

				for( var k in configsArray[0])if(k[k.length-1] == 'y' ) { console.log(k);}
				for( var k in configsArray[1])if(k[k.length-1] == 'y' ) { console.log(k);}
				
				// This code will be called when the project has finished loading.
				goo.renderer.domElement.id = 'goo';
				document.body.appendChild(goo.renderer.domElement);

				var levelRootNode = loader.getCachedObjectForRef('level_v03/entities/RootNode.entity');
				var level = loader.getCachedObjectForRef('level_v03/entities/polySurface24_0.entity');
				level.setComponent( new AmmoComponent());
				
				EntityUtils.traverse(level, function(entity) {
					if( entity.meshRendererComponent)
						entity.meshRendererComponent.isPickable = false;
				});
				
				var cam =  goo.world.createEntity( new Camera(45, 1, 0.1, 1000)).addToWorld();
				cam.transformComponent.setTranslation( 0, 1.8, 0);
				//cam.transformComponent.transform.rotation.lookAt( new Vector3(0,1,-1), new Vector3(0,1,0));

				var geo = loader2.getCachedObjectForRef('zombie_idle/entities/Zombie_Geo_0.entity');
				geo.transformComponent.setRotation(0,-Math.PI,0);
				var zombieManager = new Zombie.manager( goo, cam, loader2.getCachedObjectForRef('zombie_idle/entities/RootNode.entity'));

				zombieManager.spawn();
				
				for( var x=-20; x<20; x+=10) {
					for( var z=-20; z<20; z+=10) {
						zombieManager.spawn(x, 1.8, z);
					}
				}
				

				var blood = new Blood(goo);
				var shotgun = new Shotgun(goo, cam, blood);

				function setupPlayer() {
					var sphere = goo.world.createEntity( ShapeCreator.createSphere(10, 10, 1), Material.createMaterial( ShaderLib.simpleLit), [12, 1.8, 20], new AmmoFPSCamControlScript());
					sphere.setComponent(new AmmoComponent({mass:2}));
					sphere.addToWorld();
					sphere.meshRendererComponent.hidden = true;

					sphere.transformComponent.attachChild( cam.transformComponent);

					goo.world.process();
					sphere.ammoComponent.body.setAngularFactor(new Ammo.btVector3(0,0,0));
					//sphere.ammoComponent.body.setRestitution(0.1);
					sphere.ammoComponent.body.setFriction(2.5);
				}
				setupPlayer();
				
				
				// Start the rendering loop!
				goo.startGameLoop();

			}).then(null, function(e) {
				// If something goes wrong, 'e' is the error message from the engine.
				//alert('Failed to load scene: ' + e);
				console.log( e.stack);
			});

		}
	}

	init();
});
