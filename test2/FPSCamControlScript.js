
define(['goo/math/Vector3', 'goo/util/GameUtils'], function(Vector3, GameUtils) {
	'use strict';

	function FPSCamControlScript() {
		// this array stores all pressed keys
		this.keys = new Array(127).join('0').split('').map(parseInt); // fill with 0s

		var that = this;
		function keyHandler(e) {
			// for some reason this method is called with multiple keyDown events on a single keyDown.... ( old comment, is this still true ? )
			that.keys[e.keyCode] = e.type === "keydown" ? 1 : 0;
			if( e.keyCode == 27) {
				GameUtils.exitPointerLock();
			}
		}

		this.movementX=0;
		this.movementY=0;
		function mouseMove(e) {
			if(!document.pointerLockElement) return;
			that.movementX += e.movementX;
			that.movementY += e.movementY;
		}

		function mouseDown(e) {
			if(!document.pointerLockElement) {
				GameUtils.requestPointerLock();
			}
		}
		document.documentElement.addEventListener('mousedown', mouseDown, false);
		document.documentElement.addEventListener('mousemove', mouseMove, false);
		document.body.addEventListener('keyup', keyHandler, false);
		document.body.addEventListener('keydown', keyHandler, false);

		this.fwdBase = new Vector3(0,0,-1);
		this.leftBase = new Vector3(-1,0,0);

		this.direction = new Vector3(0,0,1);
		this.left = new Vector3(1,0,0);

		this.movement = new Vector3(1,0,0);
		this.rotVec = new Vector3();
	}
	
	FPSCamControlScript.prototype.run = function( cam, tpf) {
		var tc = cam.transformComponent;
		var camRotation = tc.transform.rotation;
		
		camRotation.toAngles(this.rotVec);
		this.rotVec.x-=this.movementY/100;
		this.rotVec.y-=this.movementX/100;
		this.movementX=0;
		this.movementY=0;
		this.rotVec.x = Math.min(this.rotVec.x, Math.PI/2)
		this.rotVec.x = Math.max(this.rotVec.x, -Math.PI/2)
		camRotation.fromAngles(this.rotVec.x,this.rotVec.y,this.rotVec.z);
		tc.setUpdated();

		tc.transform.applyForwardVector( this.fwdBase, this.direction); // get the direction the camera is looking
		tc.transform.applyForwardVector( this.leftBase, this.left); // get the direction to the left of the camera
		
		this.movement.copy(Vector3.ZERO);
		
		if (this.keys[87]) // W
			this.movement.add(this.direction);
		if (this.keys[83]) // S
			this.movement.sub(this.direction);
		if (this.keys[65]) // A
			this.movement.add(this.left);
		if (this.keys[68]) // D
			this.movement.sub(this.left);
		if (this.keys[32]) { // space bar
			this.jump = true;
		}
		
		this.movement.y = 0; // don't allow flying around, stay on ground
		this.movement.normalize(); // move the same amount regardless of where we look
		tc.addTranslation(this.movement); // move
	
	}

	return FPSCamControlScript;
});
