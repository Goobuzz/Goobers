define([
	'goo/math/Ray',
	'goo/math/Vector3',
	'goo/renderer/Material',
	'goo/renderer/light/SpotLight',
	'goo/renderer/shaders/ShaderLib',
	'goo/renderer/TextureCreator',
	'goo/shapes/ShapeCreator',
	'goo/util/GameUtils'
], function(
	Ray,
	Vector3,
	Material,
	SpotLight,
	ShaderLib,
	TextureCreator,
	ShapeCreator,
	GameUtils
) {
	'use strict';

	function Shotgun(goo, cam, blood) {
		this.goo = goo;
		this.cam = cam;
		this.blood = blood;
		var world = goo.world;
		this.ammo = 25;
		var mesh = ShapeCreator.createCylinder( 30, 2);
		var mat = Material.createMaterial( ShaderLib.simpleLit);
		var barrelLeft = world.createEntity(mesh, mat, [1.5, 0, 0]).addToWorld();
		barrelLeft.meshRendererComponent.isPickable = false;

		var barrelRight = world.createEntity(mesh, mat, [-1.5, 0, 0]).addToWorld();
		barrelRight.meshRendererComponent.isPickable = false;

		var shotgun = world.createEntity([0.2, -0.26, -1], this).addToWorld();

		shotgun.transformComponent.attachChild( barrelLeft.transformComponent);
		shotgun.transformComponent.attachChild( barrelRight.transformComponent);

		shotgun.transformComponent.setScale( 0.02, 0.02, 1); // make the barrels long
		shotgun.transformComponent.setRotation( 0.15, 0.1, 0); // rotate the shotty a bit.
		
		//var howlerComponent = new HowlerComponent(); // results in an exception...
		//howlerComponent.addSound('shotx', sound);
		//shotgun.setComponent(howlerComponent);

		this.entity = shotgun;

		var spotLight = new SpotLight();
		spotLight.angle = 25;
		//spotLight.range = 10;
		spotLight.penumbra = 5;
		spotLight.intensity = 1;

		this.spotLightEntity = world.createEntity('spotLight', spotLight).addToWorld();
		
		this.sound = new Howl({urls: ['res/sound/ssg.ogg'], volume:0.4});
		
		cam.transformComponent.attachChild( this.entity.transformComponent);
		cam.transformComponent.attachChild( this.spotLightEntity.transformComponent);
	
		var button = this.button = new Array(3).join('0').split('').map(parseFloat); // prefill with 0s
		var mouseHandler = function (e) { button[e.button] = e.type === "mousedown" ? 1 : 0; }
		document.documentElement.addEventListener('mousedown', mouseHandler, false);
		document.documentElement.addEventListener('mouseup', mouseHandler, false);


	}
	
	Shotgun.prototype.run = function( entity, tpf) {
		if( this.button[0] ) {
			this.shoot();
		}
	}
	
	Shotgun.prototype.reset = function() {
		this.entity.transformComponent.setRotation( 0.15, 0.1, 0);
	}


	Shotgun.prototype.shoot = function() {
		if(!document.pointerLockElement || this.goo.world.time - this.timeSinceAttack < 0.8 || this.ammo <= 0)
			return;

		this.ammo--;
		//document.getElementById('healthPoints').innerHTML = ""+this.player.healthPoints;
		document.getElementById('ammo').innerHTML = ""+this.ammo;
		
		this.timeSinceAttack = this.goo.world.time;
		
		// document.getElementById('snd_ssg').play();
		//shotgun.howlerComponent.playSound('shot');
		this.sound.play();
		this.entity.transformComponent.setRotation( 0.35, 0.1, 0);
		setTimeout( this.reset.bind(this), 500);
		var w = this.goo.renderer.viewportWidth;
		var h = this.goo.renderer.viewportHeight;
		var x = w / 2;
		var y = h / 2;
		this.goo.pick( x, y, function( id, depth){
			//if( id < 0) return;
			var camera = this.cam.cameraComponent.camera;
			for( var i=0; i<10; i++) {
				this.pellet( camera, x+randBlood(), y+randBlood(), w, h);
			}
			
		}.bind(this));
	}

	var pickingStore = {};
	var md_pos = new Vector3();
	var md_dir = new Vector3();
	var md_ray = new Ray();
	Shotgun.prototype.pellet = function( camera, x, y, w, h) {
		this.goo.renderer.pick( x, y, pickingStore, camera);
		if( pickingStore.id == -1)
			return;
		camera.getPickRay( x, y, w, h, md_ray);
		md_ray.direction.mul( pickingStore.depth-0.2);
		md_ray.origin.add( md_ray.direction);
		this.blood.spawn(md_ray.origin);
		
		var entity = this.goo.world.entityManager.getEntityById(pickingStore.id);
		console.log( entity.name);
		var p = entity.transformComponent.parent.entity;
		var eac = p.animationComponent;
		
		if( entity.dmg) entity.dmg += 7; else entity.dmg = 7;
		p.dmg = entity.dmg;
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

	return Shotgun;

});
