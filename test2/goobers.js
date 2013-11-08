require([
	'goo/entities/GooRunner',
	'goo/statemachine/FSMSystem',
	'goo/addons/howler/systems/HowlerSystem',
	'goo/loaders/DynamicLoader',
	'goo/math/Vector3',

	'goo/renderer/Camera',
	'goo/entities/components/CameraComponent',

	'goo/entities/components/ScriptComponent',
	'goo/scripts/OrbitCamControlScript',

	'goo/renderer/light/DirectionalLight',
	'goo/entities/components/LightComponent',
	'goo/util/GameUtils',
	'goo/util/Grid'

], function (GooRunner,FSMSystem,HowlerSystem,DynamicLoader,Vector3,Camera,CameraComponent,ScriptComponent,OrbitCamControlScript,
	DirectionalLight,LightComponent, GameUtils, Grid
) {
	'use strict';
	/*
		Available entities:
		
		entities/DefaultToolCamera.entity
		zombie_injured_walk/entities/RootNode.entity
		zombie_injured_walk/entities/Zombie_Geo_0.entity
		entities/default_light.entity
		entities/default_light_2.entity 
	*/


	function initGoobers(goo) {
	
		var grid = new Grid(goo.world, { floor: true, width: 400, height: 400, surface: true,
			surfaceColor: [0.9, 0.9, 0.9, 1],
			grids: [{
				stepX: 50,
				stepY: 50,
				color: [0.7, 0.7, 0.7, 1]
			}]
		});
		grid.addToWorld();

		goo.world.process();

		var cam = goo.world.entityManager.getEntityByName('entities/DefaultToolCamera.entity');
		cam.transformComponent.transform.translation.y = 100;
		
		var sc = cam.getComponent( 'ScriptComponent' );
		
		var keys = new Array(127).join('0').split('').map(parseInt); // fill with 0s

		function keyHandler(e) {
			// for some reason this method is called with multiple keyDown events on a single keyDown....
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

		function mouseDown(e) {
			GameUtils.requestPointerLock();
		}

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
			
			movement.y = 0;
			movement.normalize();
			cam.transformComponent.addTranslation(movement);
			
			//console.log( ent);
			//sc.scripts = [];
		}}];
	
	}

	function init() {

		var goo = new GooRunner({manuallyStartGameLoop: true});
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
