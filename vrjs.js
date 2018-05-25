(function(){
	window.requestIdleCallback =
	  window.requestIdleCallback ||
	  function (cb) {
		var start = Date.now();
		return setTimeout(function () {
		  cb({
			didTimeout: false,
			timeRemaining: function () {
			  return Math.max(0, 50 - (Date.now() - start));
			}
		  });
		}, 1);
	  }

	window.cancelIdleCallback =
	  window.cancelIdleCallback ||
	  function (id) {
		clearTimeout(id);
	  }
	  
	Element.prototype.getAttributeNames = (Element.prototype.getAttributeNames||function(){
		var attributes = this.attributes;
		var length = attributes.length;
		var result = new Array(length);
		for (var i = 0; i < length; i++) {
			result[i] = attributes[i].name;
		}
		return result;	
	});
})();

(function(win){		
	var parser=new DOMParser();
	var ve;
	var keyIndex = 0;

	var sq = win.SyncQueue = new Array();
	var asq = win.ASyncQueue = new Array();
	var version = Date.now();
	
	win.vrjs = (function(){
		var isRun, isInit;
		var getAttr, getAttrNames, removeAttr, setAttr, style;
		var cssText, getProp, setProp, removeProp, getComputedStyle = win.getComputedStyle;
		var elmProp = HTMLElement.prototype;
		var styleProp = CSSStyleDeclaration.prototype;
		var CSS_RULES;

		
		
		var oldTime = Date.now();
		var curRun, oldRun;
		
		var ProcessRunnable = function(){
			var start = false;
			var startTime;
			var next;
			return {
				start: function(){
					startTime = Date.now();
					start = true;
					while(start && (Date.now() - startTime) < 16){
						if(elm = sq.shift()){
							if(elm.__getVE().__changeStyle)
								syncAttributes(elm.__getVE(), elm);
							else
								asq.push(elm);
						}else{
							break;
						}
					}
				},
				stop: function(){
					start = false;
				},
				setNext: function(nextFunc){
					next = nextFunc;
				}
			}
		}
	
		function syncAttributes(currunt, target){
			var cAttrs = getAttrNames.call(currunt);
			var tAttrs = getAttrNames.call(target);
			
			for(var index in tAttrs){
				if(currunt.hasAttribute(tAttrs[index])){
					removeAttr.call(target, tAttrs[index]);
				}
			}
			for(var index in cAttrs){
				if(getAttr.call(target, cAttrs[index]) != getAttr.call(currunt, cAttrs[index])){
					setAttr.call(target, cAttrs[index], getAttr.call(currunt, cAttrs[index]));
				}
			}
		}
		
		function clearQueue(){
			while(elm = asq.shift()){
				syncAttributes(elm.__getVE(), elm);
			}
			while(elm = sq.shift()){
				syncAttributes(elm.__getVE(), elm);
			}
		}
		
		function callback(deadline) {
			oldTime = Date.now();
			if(!isRun)
				clearQueue();
			
			var elm;
			if(!deadline.didTimeout) {
				while((Date.now() - oldTime) < 5){
					if(elm = asq.shift())
						syncAttributes(elm.__getVE(), elm);
					else
						break;
				}
			}
		}
		function ani(timestamp){
			if(isRun){
				window.requestAnimationFrame(jobQueue.run);
				window.requestAnimationFrame(ani);
				window.requestIdleCallback(callback, { timeout: 3 });
				//window.requestIdleCallback(jobQueue.run, { timeout: 3 });
				
			}else{
				clearQueue();
			}
				
			
			if(oldRun) oldRun.stop();
			curRun = ProcessRunnable();
			curRun.start();
		}
		
		return{
			start: function(){
				if(isRun){
					return;
				}
				isRun = true;
				
				getAttr = elmProp.getAttribute;
				getAttrNames = elmProp.getAttributeNames;
				removeAttr = elmProp.removeAttribute;
				setAttr = elmProp.setAttribute;
				style = Object.getOwnPropertyDescriptor(elmProp, "style");
				
				cssText = Object.getOwnPropertyDescriptor(styleProp, "cssText");
				getProp = styleProp.getPropertyValue;
				setProp = styleProp.setProperty;
				removeProp = styleProp.removeProperty;
				
				if(!CSS_RULES){
					var rootStyle = getComputedStyle(document.firstElementChild || document.lastChild);
					CSS_RULES = new Array(rootStyle.length);
					for(var i = 0; i < rootStyle.length; i++){
						CSS_RULES[i] = rootStyle[i];
					}
				}
				
				
				win.getComputedStyle = function(elm, option){
					elm.__getVE();
					getComputedStyle(elm, option);
				}
				
				var initVE = function(elm){
					if(!elm.__VE){
						elm.__key = ++keyIndex;
						//ve = elm.__VE = elm.cloneNode();
						ve = elm.__VE = new ElementAttribute();
						ve.__version = undefined;
						ve.__changeStyle = false;
						ve.__original = elm;	//	win.getComputedStyle로 리턴했을 경우 가상D
						
					}
				}

				elmProp.__getVE = function(){
					if(this.__original)
						return this;
					
					if(!this.__VE)
						initVE(this);
					
					if(this.__VE.__version != version){
						this.__VE.__version = version;
						syncUnAttributes(this, this.__VE);
					}
					
					return this.__VE;
				}
				
				elmProp.getAttribute = function(name){
					return getAttr.call(this.__getVE(), name);
				}
				elmProp.getAttributeNames = function(){
					return getAttrNames.call(this.__getVE());
				}
				
				elmProp.removeAttribute = function(name){
					ve = this.__getVE();
					removeAttr.call(ve, name);
					if(name == "style" || name == "class" || name == "name" || name == "id" || name == "height" || name == "width" || name == "rows" || name == "cols")
						ve.__changeStyle = true;
					
					if(sq.indexOf(this) < 0) sq.push(this);
				}
				
				elmProp.setAttribute = function(name, value){
					ve = this.__getVE();
					setAttr.call(ve, name, value);
					if(name == "style" || name == "class" || name == "name" || name == "id" || name == "height" || name == "width" || name == "rows" || name == "cols")
						ve.__changeStyle = true;
					
					if(sq.indexOf(this) < 0) sq.push(this);
				}
				
				Object.defineProperty(elmProp, 'style', {
					get: function(){
						if(!style.get.call(this).__elm)
							style.get.call(this).__elm = this;
									
						return style.get.call(this.__getVE());
					},
					set: function(value){
						style.set.call(this.__getVE(), value);
						this.__elm.__getVE().__changeStyle = true;
						if(sq.indexOf(this) < 0) sq.push(this);
					}
				});
				
				Object.defineProperty(styleProp, 'cssText', {
					get: function(){
						return cssText.get.call(this.__elm.__getVE().style);
					},
					set: function(value){
						ve = this.__elm.__getVE()
						cssText.call(ve._style, value);
						ve.__changeStyle = true;
						if(sq.indexOf(this.__elm) < 0) sq.push(this.__elm);
					}
				});
				
				styleProp.getPropertyValue = function(name){
					getProp.call(this.__elm.__getVE().style, name);
				}
				
				styleProp.setProperty = function(name, value){
					ve = this.__elm.__getVE();
					setProp.call(ve.style, name, value);
					ve.__changeStyle = true;
					if(sq.indexOf(this.__elm) < 0) sq.push(this.__elm);
				}
				
				styleProp.removeProperty = function(name){
					ve = this.__elm.__getVE();
					removeProp.call(ve.style, name);
					ve.__changeStyle = true;
					if(sq.indexOf(this.__elm) < 0) sq.push(this.__elm);
				}
				
				window.requestIdleCallback(callback, { timeout: 6 });
				
			},
			
			stop: function(){
				
				elmProp.getAttribute = getAttr;
				elmProp.getAttributeNames = getAttrNames;
				elmProp.removeAttribute = removeAttr;
				elmProp.setAttribute = setAttr;
				Object.defineProperty(elmProp, 'style', style);
				
				Object.defineProperty(styleProp, 'cssText', cssText);
				styleProp.getPropertyValue = getProp;
				styleProp.setProperty = setProp;
				styleProp.removeProperty = removeProp;
				
				isRun = false;
			}
		}
	})();
	
	
})(window);
