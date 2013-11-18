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

	/*
		Available entities in bundle:
		entities/DefaultToolCamera.entity
		zombie_injured_walk/entities/RootNode.entity
		zombie_injured_walk/entities/Zombie_Geo_0.entity
		entities/default_light.entity
		entities/default_light_2.entity 
	*/

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
		grid.addToWorld();
		
		var blood = new Blood(goo);
		var spat = blood.spawn([10,10,10]);

		goo.world.process(); // activate all pending entities.

		var cam = goo.world.entityManager.getEntityByName('entities/DefaultToolCamera.entity');
		cam.transformComponent.transform.translation.y = 100;  // TODO: a bit high ? maybe we need to scale the zombie a bit down...


		var sound = new Howl({urls: ['ssg.ogg']});

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

		
		function resetSSG() {
			shotgun.transformComponent.setRotation( 0.15, 0.1, 0);
		}

		var pickingStore = {};
		var md_pos = new Vector3();
		var md_dir = new Vector3();
		var md_ray = new Ray();
		function pellet( camera, x, y, w, h) {
			goo.renderer.pick( x, y, pickingStore, camera);
			console.log( pickingStore.id);
			if( pickingStore.id == -1)
				return;
			
			camera.getPickRay( x, y, w, h, md_ray);
			md_ray.direction.mul( pickingStore.depth);
			md_ray.origin.add( md_ray.direction);
			blood.spawn(md_ray.origin);
			
			/*
			camera.getWorldCoordinates( x, y, w, h, 0, md_pos);
			//pos.copy( camera.translation);
			md_dir.copy( camera._direction);
			md_dir.mul( pickingStore.depth);
			md_pos.add( md_dir);
			blood.spawn(md_pos);
			*/
			
			var entity = goo.world.entityManager.getEntityById(pickingStore.id);
			// deduct hp
		}

		function mouseDown(e) {
			if(document.pointerLockElement) {
				// document.getElementById('snd_ssg').play();
				//shotgun.howlerComponent.playSound('shot');
				//sound.play();
				shotgun.transformComponent.setRotation( 0.35, 0.1, 0);
				setTimeout( resetSSG, 500);
				var w = goo.renderer.viewportWidth;
				var h = goo.renderer.viewportHeight;
				var x = w / 2;
				var y = h / 2;
				goo.pick( x, y, function( id, depth){
					//if( id < 0) return;
					var camera = cam.cameraComponent.camera;
					//pellet( camera, x, y, w, h);
					pellet( camera, x, y, w, h);

					pellet( camera, x+30, y+30, w, h);
					pellet( camera, x-30, y+30, w, h);
					pellet( camera, x+30, y-30, w, h);
					pellet( camera, x-30, y-30, w, h);
					
				});
			}
		}
		document.documentElement.addEventListener('mousedown', mouseDown, false);

		// replace the OrbitCamera with the FPSCamera
		cam.getComponent('ScriptComponent').scripts = [new FPSCamControlScript(cam)];
	
	}

	function init() {

		var goo = new GooRunner({manuallyStartGameLoop: true, logo: true});
		goo.world.setSystem(new HowlerSystem());
		
		// The Loader takes care of loading data from a URL...
		var loader = new DynamicLoader({world: goo.world, rootPath: 'res'});

		loader.loadFromBundle('project.project', 'root.bundle')
		.then(function(configs) {
			initGoobers(goo);
			goo.renderer.domElement.id = 'goo';
			document.body.appendChild(goo.renderer.domElement);
			goo.startGameLoop();
		})
		.then(null, function(e) {
			// The second parameter of 'then' is an error handling function.
			// We just pop up an error message in case the scene fails to load.
			console.log(e);
			console.log('Failed to load scene: ' + e);
			alert('Failed to load scene: ' + e);
		});
	}

	init();
});
