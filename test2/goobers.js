require([
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
	'goo/util/Grid'
	], function( HowlerSystem, EntityUtils, GooRunner, DynamicLoader, Vector3, Camera, Material, DirectionalLight, ShaderLib, ShapeCreator, GameUtils, Grid ) {
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
	
		var gui = new dat.GUI({autoPlace:false}); // https://code.google.com/p/dat-gui/
		gui.domElement.style.position = 'absolute';
		gui.domElement.style.top = '0px';
		gui.domElement.style.right = '160px';
		gui.domElement.style['z-index'] = '100';
		document.getElementById('datGUI').appendChild(gui.domElement);

		
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
			
			return shotgun;
		}

		var shotgun = createShotgun();
		cam.transformComponent.attachChild( shotgun.transformComponent);
		
		// this array stores all pressed keys
		var keys = new Array(127).join('0').split('').map(parseInt); // fill with 0s

		function keyHandler(e) {
			// for some reason this method is called with multiple keyDown events on a single keyDown.... ( old comment, is this still true ? )
			keys[e.keyCode] = e.type === "keydown" ? 1 : 0;
			if( e.keyCode == 27) {
				GameUtils.exitPointerLock();
			}
		}

		var tmpVec = new Vector3();
		function mouseMove(e) {
			if(!document.pointerLockElement) return;
			if( e.movementX || e.movementY ) {
				cam.transformComponent.transform.rotation.toAngles(tmpVec);
				cam.transformComponent.transform.rotation.fromAngles(tmpVec.x-e.movementY/100,tmpVec.y-e.movementX/100,tmpVec.z);
				cam.transformComponent.setUpdated();
			}
		}
		
		function resetSSG() {
			shotgun.transformComponent.setRotation( 0.15, 0.1, 0);
		}

		function mouseDown(e) {
			if(document.pointerLockElement) {
				document.getElementById('snd_ssg').play();
				shotgun.transformComponent.setRotation( 0.35, 0.1, 0);
				setTimeout( resetSSG, 1000);
			} else
				GameUtils.requestPointerLock();

		}

		// TODO: move all FPS code to its own Script or even a Component
		document.documentElement.addEventListener('mousedown', mouseDown, false);
		document.documentElement.addEventListener('mousemove', mouseMove, false);
		document.body.addEventListener('keyup', keyHandler, false);
		document.body.addEventListener('keydown', keyHandler, false);
		
		var fwdBase = new Vector3(0,0,-1);
		var leftBase = new Vector3(-1,0,0);

		var direction = new Vector3(0,0,1);
		var left = new Vector3(1,0,0);

		var movement = new Vector3(1,0,0);

		// replace the OrbitCamera with a FPS Camera
		var sc = cam.getComponent( 'ScriptComponent' );
		sc.scripts = [{ run : function( cam, tpf ) {
			
			//this.time += tpf;
			
			cam.transformComponent.transform.applyForwardVector( fwdBase, direction); // get the direction the camera is looking
			cam.transformComponent.transform.applyForwardVector( leftBase, left); // get the direction to the left of the camera
			
			movement.copy(Vector3.ZERO);
			
			if (keys[87]) // W
				movement.add(direction);
			if (keys[83]) // S
				movement.sub(direction);
			if (keys[65]) // A
				movement.add(left);
			if (keys[68]) // D
				movement.sub(left);
			if (keys[32]) { // space bar
				jump = true;
			}
			
			movement.y = 0; // don't allow flying around, stay on ground
			movement.normalize(); // move the same amount regardless of where we look
			cam.transformComponent.addTranslation(movement); // move
			
		}}];
	
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
