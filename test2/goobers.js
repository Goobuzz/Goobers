require([
	'goo/addons/howler/components/HowlerComponent',
	'goo/addons/howler/systems/HowlerSystem',
	'goo/entities/components/LightComponent',
	'goo/entities/EntityUtils',
	'goo/entities/GooRunner',
	'goo/loaders/DynamicLoader',
	'goo/math/Ray',
	'goo/math/Vector3',
	'goo/renderer/Camera',
	'goo/renderer/Material',
	'goo/renderer/light/DirectionalLight',
	'goo/renderer/light/SpotLight',
	'goo/renderer/shaders/ShaderLib',
	'goo/renderer/TextureCreator',
	'goo/shapes/ShapeCreator',
	'goo/util/GameUtils',
	'goo/util/Grid',
	
	'goo/entities/systems/ParticlesSystem',
	'goo/entities/components/ParticleComponent',
	'goo/particles/ParticleUtils',
	
	'FPSCamControlScript',
	'Blood'
	], function( HowlerComponent, HowlerSystem, LightComponent, EntityUtils, GooRunner, DynamicLoader, Ray, Vector3, Camera,
		Material, DirectionalLight, SpotLight, ShaderLib, TextureCreator, ShapeCreator, GameUtils, Grid,
		ParticlesSystem, ParticleComponent, ParticleUtils,
		FPSCamControlScript, Blood ) {
	'use strict';

	function initGoobers(goo) {

		// add a nice floor
		var grid = new Grid(goo.world, { floor: true, width: 400, height: 400, surface: true,
			surfaceColor: [0.9, 0.9, 0.9, 1],
			grids: [{
				stepX: 50,
				stepY: 50,
				color: [0.7, 0.7, 0.7, 1]
			}]
		});
		EntityUtils.traverse(grid.topEntity, function(entity) {
			if( entity.meshRendererComponent)
				entity.meshRendererComponent.isPickable = false;
		});
		grid.addToWorld();
		
		var camera = new Camera( 45, 1, 0.1, 1000);
		var cam = EntityUtils.createTypicalEntity( goo.world, camera, new FPSCamControlScript(), [0,0,5]);
		cam.addToWorld();
		cam.transformComponent.transform.translation.z = 400;
		cam.transformComponent.transform.translation.y = 100;  // TODO: a bit high ? maybe we need to scale the zombie a bit down...

		var sound = new Howl({urls: ['ssg.ogg'], volume:0.4});

		// make a cheap shotgun
		function createShotgun() {
			var mesh = ShapeCreator.createCylinder( 30, 2);
			var mat = Material.createMaterial( ShaderLib.simpleLit, 'BoxMaterial');
			var barrelLeft = EntityUtils.createTypicalEntity( goo.world, mesh, mat);
			barrelLeft.addToWorld();
			barrelLeft.transformComponent.setTranslation( 1.5, 0, 0);
			barrelLeft.meshRendererComponent.isPickable = false;

			var barrelRight = EntityUtils.createTypicalEntity( goo.world, mesh, mat);
			barrelRight.addToWorld();
			barrelRight.transformComponent.setTranslation( -1.5, 0, 0 );
			barrelRight.meshRendererComponent.isPickable = false;

			var shotgun = EntityUtils.createTypicalEntity( goo.world);
			shotgun.addToWorld();

			shotgun.transformComponent.attachChild( barrelLeft.transformComponent);
			shotgun.transformComponent.attachChild( barrelRight.transformComponent);

			shotgun.transformComponent.setTranslation( 10, -13, -55 );
			shotgun.transformComponent.setScale( 1, 1, 55); // make the barrels long

			shotgun.transformComponent.setRotation( 0.15, 0.1, 0); // rotate the shotty a bit.
			
			//var howlerComponent = new HowlerComponent(); // results in an exception...
			//howlerComponent.addSound('shotx', sound);
			//shotgun.setComponent(howlerComponent);

			
			return shotgun;
		}

		var shotgun = createShotgun();
		cam.transformComponent.attachChild( shotgun.transformComponent);
		
		var spotLight = new SpotLight();
		spotLight.angle = 25;
		//spotLight.range = 10;
		spotLight.penumbra = 5;
		spotLight.intensity = 1;

		var spotLightEntity = goo.world.createEntity('spotLight');
		spotLightEntity.setComponent(new LightComponent(spotLight));
		spotLightEntity.addToWorld();

		cam.transformComponent.attachChild( spotLightEntity.transformComponent);

		var blood = new Blood(goo);

		function resetSSG() {
			shotgun.transformComponent.setRotation( 0.15, 0.1, 0);
		}

		var pickingStore = {};
		var md_pos = new Vector3();
		var md_dir = new Vector3();
		var md_ray = new Ray();
		function pellet( camera, x, y, w, h) {
			goo.renderer.pick( x, y, pickingStore, camera);
			if( pickingStore.id == -1)
				return;
			camera.getPickRay( x, y, w, h, md_ray);
			md_ray.direction.mul( pickingStore.depth-10);
			md_ray.origin.add( md_ray.direction);
			blood.spawn(md_ray.origin);
			
			var entity = goo.world.entityManager.getEntityById(pickingStore.id);
			var p = entity.transformComponent.parent.entity;
			var eac = p.animationComponent;
			
			if( entity.dmg) entity.dmg += 7; else entity.dmg = 7;
			if( entity.dmg && entity.dmg == 7) {
				eac.transitionTo( eac.getStates()[1]); // idle, injured_walk, uppercut_jab, dying
			}
			if( entity.dmg && entity.dmg > 100) {
				eac.layers[0]._steadyStates['mixamo_com__']._sourceTree._clipInstance._loopCount=1;
				eac.transitionTo( eac.getStates()[3]); // idle, injured_walk, uppercut_jab, dying
			}
		}

		function randInt(max) {
			return Math.floor(Math.random()*max);
		}
		function randBlood() {
			return randInt(200)-100;
		}

		function mouseDown(e) {
			if(document.pointerLockElement) {
				// document.getElementById('snd_ssg').play();
				//shotgun.howlerComponent.playSound('shot');
				sound.play();
				shotgun.transformComponent.setRotation( 0.35, 0.1, 0);
				setTimeout( resetSSG, 500);
				var w = goo.renderer.viewportWidth;
				var h = goo.renderer.viewportHeight;
				var x = w / 2;
				var y = h / 2;
				goo.pick( x, y, function( id, depth){
					//if( id < 0) return;
					var camera = cam.cameraComponent.camera;
					
					for( var i=0; i<10; i++) {
						pellet( camera, x+randBlood(), y+randBlood(), w, h);
					}
					
				});
			}
		}
		document.documentElement.addEventListener('mousedown', mouseDown, false);
	}

	function endsWith(str, suffix) {
		return str.indexOf(suffix, str.length - suffix.length) !== -1;
	}

	function init() {
		var goo = new GooRunner({manuallyStartGameLoop: true, logo: true});
		goo.world.setSystem(new HowlerSystem());
		
		// The Loader takes care of loading data from a URL...
		var loader = new DynamicLoader({world: goo.world, rootPath: 'res'});

		loader.loadFromBundle('project.project', 'root.bundle')
		.then(function(configs) {
		
			var zomb = loader.getCachedObjectForRef("zombie_idle/entities/RootNode.entity");
			var zomb2 = EntityUtils.clone( goo.world, zomb);
			zomb2.transformComponent.addTranslation( 85,0,0);
			zomb2.addToWorld();
			
			initGoobers(goo);
			goo.renderer.domElement.id = 'goo';
			document.body.appendChild(goo.renderer.domElement);
			goo.startGameLoop();
		})
		.then(null, function(e) {
			// The second parameter of 'then' is an error handling function.
			// We just pop up an error message in case the scene fails to load.
			console.log(e.stack);
			console.log('Failed to load scene: ' + e);
			//alert('Failed to load scene: ' + e);
		});
	}

	init();
});
