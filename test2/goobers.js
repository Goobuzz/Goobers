require([
	'goo/addons/howler/components/HowlerComponent',
	'goo/addons/howler/systems/HowlerSystem',
	'goo/entities/components/LightComponent',
	'goo/entities/EntityUtils',
	'goo/entities/GooRunner',
	'goo/loaders/DynamicLoader',
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
	
	'FPSCamControlScript'
	], function( HowlerComponent, HowlerSystem, LightComponent, EntityUtils, GooRunner, DynamicLoader, Vector3, Camera,
		Material, DirectionalLight, SpotLight, ShaderLib, TextureCreator, ShapeCreator, GameUtils, Grid,
		ParticlesSystem, ParticleComponent, ParticleUtils,
		FPSCamControlScript ) {
	'use strict';

	/*
		Available entities in bundle:
		
		entities/DefaultToolCamera.entity
		zombie_injured_walk/entities/RootNode.entity
		zombie_injured_walk/entities/Zombie_Geo_0.entity
		entities/default_light.entity
		entities/default_light_2.entity 
	*/

	function addBlood(goo) {
		var texture = new TextureCreator().loadTexture2D('flare.png');
		texture.generateMipmaps = true;
		//texture.wrapS = 'EdgeClamp';
		//texture.wrapT = 'EdgeClamp';

		var material = Material.createMaterial(ShaderLib.particles);
		material.setTexture('DIFFUSE_MAP', texture);
		material.blendState.blending = 'AlphaBlending'; // 'AdditiveBlending';
		material.cullState.enabled = false;
		material.depthState.write = false;
		material.renderQueue = 2001;

		var particleComponent = new ParticleComponent({
			//particleCount : 200,
			timeline : [
				{timeOffset: 0.00, color: [1, 0, 0, 0.5], size: 2.0, spin: 0, mass: 1},
				{timeOffset: 0.25, color: [1, 0, 0, 0.5]},
				{timeOffset: 0.25, color: [1, 0, 0, 0.5]},
				{timeOffset: 0.50, color: [1, 0, 0, 0], size: 3.0,}
			],
			emitters : [{
				totalParticlesToSpawn : -1,
				releaseRatePerSecond : 5,
				minLifetime : 1.0,
				maxLifetime : 2.5,
				getEmissionVelocity : function (particle/*, particleEntity*/) {
					var vec3 = particle.velocity;
					return ParticleUtils.getRandomVelocityOffY(vec3, 0, Math.PI * 15 / 180, 5);
				}
			}]
		});
		
		particleComponent.emitters[0].influences.push(ParticleUtils.createConstantForce(new Vector3(0, -20, 0)));

		var entity = EntityUtils.createTypicalEntity( goo.world, material, particleComponent.meshData, [-10, 90, 25]);
		entity.setComponent(particleComponent);
		entity.addToWorld();
	}

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
		
		addBlood( goo);

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
			console.log(e);
			console.log('Failed to load scene: ' + e);
			alert('Failed to load scene: ' + e);
		});
	}

	init();
});
