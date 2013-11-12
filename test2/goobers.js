require([
	'goo/addons/howler/components/HowlerComponent',
	'goo/addons/howler/systems/HowlerSystem',
	'goo/entities/EntityUtils',
	'goo/entities/GooRunner',
	'goo/loaders/DynamicLoader',
	'goo/math/Vector3',
	'goo/renderer/Camera',
	'goo/renderer/Material',
	'goo/renderer/light/DirectionalLight',
	'goo/renderer/shaders/ShaderLib',
	'goo/shapes/ShapeCreator',
	'goo/util/GameUtils',
	'goo/util/Grid',
	'FPSCamControlScript'
	], function( HowlerComponent, HowlerSystem, EntityUtils, GooRunner, DynamicLoader, Vector3, Camera,
					Material, DirectionalLight, ShaderLib, ShapeCreator, GameUtils, Grid, FPSCamControlScript ) {
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

			var barrelRight = EntityUtils.createTypicalEntity( goo.world, mesh, mat);
			barrelRight.addToWorld();
			barrelRight.transformComponent.setTranslation( -1.5, 0, 0 );

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
		

		
		function resetSSG() {
			shotgun.transformComponent.setRotation( 0.15, 0.1, 0);
		}

		function mouseDown(e) {
			if(document.pointerLockElement) {
				// document.getElementById('snd_ssg').play();
				//shotgun.howlerComponent.playSound('shot');
				sound.play();
				shotgun.transformComponent.setRotation( 0.35, 0.1, 0);
				setTimeout( resetSSG, 500);
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
			alert('Failed to load scene: ' + e);
		});
	}

	init();
});
