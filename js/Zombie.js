define([
	'goo/math/Ray',
	'goo/math/Vector3',
	'goo/shapes/ShapeCreator',
	'goo/renderer/Material',
	'goo/renderer/shaders/ShaderLib',
	'goo/addons/ammo/AmmoComponent',
	'goo/entities/components/ScriptComponent',
	'goo/entities/EntityUtils'
], function(
	Ray,
	Vector3,
	ShapeCreator, Material, ShaderLib,
	AmmoComponent,
	ScriptComponent, EntityUtils
) {
	'use strict';

	function Zombie( goo, cam, zombieEntity, initPos) {
		this.goo = goo;
		this.cam = cam;
		this.zombieEntity = zombieEntity;
		
		this.fwdBase = new Vector3(0,0,-1);
		this.direction = new Vector3(0,0,1);
		
		this.ammoVector = new Ammo.btVector3(0, 0, 0);

		//zombieEntity.setComponent( new ScriptComponent( this ));
		
		var eac = this.eac = zombieEntity.animationComponent;
		eac.transitionTo( eac.getStates()[1]);
		
		zombieEntity.transformComponent.setTranslation(0,-1,0);
		
		var sphere = this.entity = goo.world.createEntity( ShapeCreator.createSphere(10, 10, 1), Material.createMaterial( ShaderLib.simpleLit), this, initPos);
		this.lastRotation = sphere.transformComponent.transform.rotation.clone();
		sphere.setComponent(new AmmoComponent({mass:2}));
		sphere.addToWorld();
		sphere.meshRendererComponent.hidden = true;
		sphere.transformComponent.attachChild( zombieEntity.transformComponent);
		goo.world.process();
		sphere.ammoComponent.body.setAngularFactor(new Ammo.btVector3(0,0,0));

	}
	
	Zombie.prototype.checkAttack = function(time) {
        this.timeSinceAttack += time;
        if (this.timeSinceAttack > 0.292) {
	        this.timeSinceAttack = 0;
       		if( this.player.position.distanceSquared(this.position) < 30) {
       			this.player.healthPoints-=10;
				document.getElementById('healthPoints').innerHTML = ""+this.player.healthPoints;
	       	}
	        //document.getElementById('snd_step'+Math.ceil(Math.random()*3)).play(); // TODO: play attack sound, sync with animation
        }
    };

	
	var tmpVec = new Vector3();
	Zombie.prototype.run = function( entity, tpf) {
	
		var tc = entity.transformComponent;

		if( this.zombieEntity.dmg > 100) { // dead
			entity.ammoComponent.body.setActivationState( 5); // DISABLE_SIMULATION
			//entity.ammoComponent.body.setCollisionFlags( 4); // CF_NO_CONTACT_RESPONSE 
			tc.transform.rotation.copy( this.lastRotation); // this line is needed so that the physics objects rotation is not used
			return;
		}

		var pos = tc.transform.translation;
		var camPos = this.cam.transformComponent.worldTransform.translation;
		tmpVec.copy( camPos );
		tmpVec.y = tc.transform.translation.y;
		tc.lookAt( tmpVec, Vector3.UNIT_Y );

		this.lastRotation.copy( tc.transform.rotation); // save this for use when dead

		var eac = this.eac;
		if( pos.distanceSquared( camPos) < 10) {
			eac.transitionTo(eac.getStates()[2]); // fight animation
			return;
		} else {
			eac.transitionTo(eac.getStates()[1]); // walk animation
		}

		tc.transform.applyForwardVector( this.fwdBase, this.direction); // get direction we are facing
		this.ammoVector.setValue( this.direction.x*10, 0, this.direction.z*10); // move in the direction we are facing

		entity.ammoComponent.body.applyCentralForce( this.ammoVector);
		//entity.ammoComponent.body.setLinearVelocity( this.ammoVector);
		entity.ammoComponent.body.activate();

		var velocity = entity.ammoComponent.body.getLinearVelocity();
		var len = velocity.length();
		if( len > 1) { // limit max speed
			velocity.op_mul( 1/len);
			entity.ammoComponent.body.setLinearVelocity(velocity);
		}
		
	}
	
	Zombie.manager = function( goo, cam, zombieEntity) {
		this.goo = goo;
		this.cam = cam;
		this.zombieEntity = zombieEntity;
		zombieEntity.removeFromWorld();
	}
	
	Zombie.manager.prototype.spawn = function( x, y, z) {
		return new Zombie( this.goo, this.cam, EntityUtils.clone( this.goo.world, this.zombieEntity).addToWorld(), [x,y,z]);
	}

	return Zombie;

});
