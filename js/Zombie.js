define([
	'goo/math/Ray',
	'goo/math/Vector3',
	'goo/shapes/ShapeCreator',
	'goo/renderer/Material',
	'goo/renderer/shaders/ShaderLib',
	'goo/addons/ammo/AmmoComponent',
	'goo/entities/components/ScriptComponent'
], function(
	Ray,
	Vector3,
	ShapeCreator, Material, ShaderLib,
	AmmoComponent,
	ScriptComponent
) {
	'use strict';

	function Zombie( goo, cam, zombieEntity) {
		this.goo = goo;
		this.cam = cam;
		this.zombieEntity = zombieEntity;
		
		this.fwdBase = new Vector3(0,0,-1);
		this.direction = new Vector3(0,0,1);
		
		this.ammoVector = new Ammo.btVector3(0, 0, 0);

		//zombieEntity.setComponent( new ScriptComponent( this ));
		
		var eac = zombieEntity.animationComponent;
		eac.transitionTo( eac.getStates()[1]);
		
		zombieEntity.transformComponent.setTranslation(0,-1,0);
		
		var sphere = this.sphere = goo.world.createEntity( ShapeCreator.createSphere(10, 10, 1), Material.createMaterial( ShaderLib.simpleLit), this);
		this.lastRotation = sphere.transformComponent.transform.rotation.clone();
		sphere.setComponent(new AmmoComponent({mass:2}));
		sphere.addToWorld();
		sphere.meshRendererComponent.hidden = true;
		sphere.transformComponent.attachChild( zombieEntity.transformComponent);
		goo.world.process();
		sphere.ammoComponent.body.setAngularFactor(new Ammo.btVector3(0,0,0));


	}
	
	var tmpVec = new Vector3();
	Zombie.prototype.run = function( entity) {
	
		var tc = entity.transformComponent;

		if( this.zombieEntity.dmg > 100) {
			entity.ammoComponent.body.setActivationState( 5);
			//entity.ammoComponent.body.setCollisionFlags( 4); // CF_NO_CONTACT_RESPONSE 
			tc.transform.rotation.copy( this.lastRotation);
			return;
		}
	

		tmpVec.copy( this.cam.transformComponent.worldTransform.translation);
		tmpVec.y = tc.transform.translation.y;
		tc.lookAt( tmpVec, Vector3.UNIT_Y );
		
		this.lastRotation.copy( tc.transform.rotation);
		
		
		tc.transform.applyForwardVector( this.fwdBase, this.direction);
		
		this.ammoVector.setValue( this.direction.x*10, 0, this.direction.z*10);
		
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

	return Zombie;

});