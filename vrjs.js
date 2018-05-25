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
	
	String.prototype.toCamelCase = function(cap1st) {
	  return ((cap1st ? "-" : "") + this).replace(/-+([^-])/g, function(a, b) {
	    return b.toUpperCase();
	  });
	};
})();

(function(win){		
	var parser=new DOMParser();
	var ve;
	var keyIndex = 0;

	var sq = win.SyncQueue = new Array();
	var asq = win.ASyncQueue = new Array();
	var kh = win.KeyHash = new Array();
	var version = Date.now();
		
	var jobQueue = (function(){
		var isJob;
		var elms = new Array();

		return {
			add : function(elm){
				elms.push(elm);
			},
			run : function(deadline){
				var elm;
				while(elm = elms.shift()){
					if(!kh[elm.__key]){
						sq.push(elm);
						kh[elm.__key] = elm;
					}
				}
			}
		}

	})();
	
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
					while(start/* && (Date.now() - startTime) < 4*/){
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
		    var cAttrs = currunt.attributes;
		    var tAttrs = target.attributes;
		    var dummy = {};

		    for(var i = 0 ; i < tAttrs.length ;i++){
			if(!cAttrs.hasOwnProperty(tAttrs[i].name)){
			    tAttrs.removeNamedItem(tAttrs[i].name);
			}
		    }
		    for(var i = 0 ; i < cAttrs.length ;i++){
			if((tAttrs.getNamedItem(cAttrs[i].name)||dummy).value != (cAttrs.getNamedItem(cAttrs[i].name)||dummy).value){
			    tAttrs.setNamedItem(cAttrs[i].cloneNode());
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
				while((Date.now() - oldTime) < 2){
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
						ve = elm.__VE = elm.cloneNode();
						//ve = elm.__VE = new ElementAttribute();
						ve.__key = elm.__key = ++keyIndex;
						ve.__style = style.get.call(ve);
						ve.__style.__elm = ve;
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
						syncAttributes(this, this.__getVE());
					}
					
					return this.__VE;
				}
				
				elmProp.getAttribute = function(namea){
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
					
					jobQueue.add(this);
				}
				
				elmProp.setAttribute = function(name, value){
					ve = this.__getVE();
					setAttr.call(ve, name, value);
					if(name == "style" || name == "class" || name == "name" || name == "id" || name == "height" || name == "width" || name == "rows" || name == "cols")
						ve.__changeStyle = true;
					
					jobQueue.add(this);
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
						jobQueue.add(this);
					}
				});
				
				Object.defineProperty(styleProp, 'cssText', {
					get: function(){
						return cssText.get.call(this.__elm.__getVE().__style);
					},
					set: function(value){
						ve = this.__elm.__getVE()
						cssText.set.call(ve.__style, value);
						ve.__changeStyle = true;
						jobQueue.add(ve.__original);
					}
				});
				
				styleProp.getPropertyValue = function(name){
					getProp.call(this.__elm.__getVE().__style, name);
				}
				
				styleProp.setProperty = function(name, value){
					ve = this.__elm.__getVE();
					setProp.call(ve.__style, name, value);
					ve.__changeStyle = true;
					jobQueue.add(ve.__original);
				}
				
				styleProp.removeProperty = function(name){
					ve = this.__elm.__getVE();
					removeProp.call(ve.__style, name);
					ve.__changeStyle = true;
					jobQueue.add(ve.__original);
				}
				
				var stylePropFunc;
				for(var index in CSS_RULES){
					(function(){
						var property = CSS_RULES[index];
						stylePropFunc = {
							get: function(){
								return styleProp.getPropertyValue.call(this, property);
							},
							set: function(value){
								styleProp.setProperty.call(this, property, value);
							}
						};
						Object.defineProperty(CSSStyleDeclaration.prototype, property, stylePropFunc);

						if(property !== property.toCamelCase())
							Object.defineProperty(CSSStyleDeclaration.prototype, property.toCamelCase(), stylePropFunc);
					})();
				}
				
				//window.requestIdleCallback(callback, { timeout: 6 });
				window.requestAnimationFrame(ani);
				
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
