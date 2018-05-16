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

	var sq = win.SyncQueue = new Array();
	var asq = win.ASyncQueue = new Array();
	var version = Date.now();
	
	win.vrjs = (function(){
		var isRun, isInit;
		var getAttr, getAttrNames, removeAttr, setAttr, style;
		var cssText, getProp, setProp, removeProp, getComputedStyle = win.getComputedStyle;
		var elmProp = HTMLElement.prototype;
		var styleProp = CSSStyleDeclaration.prototype;

		
		
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
			if(isRun)
				window.requestAnimationFrame(ani);
			else
				clearQueue();
			
			var elm;
			if(!deadline.didTimeout) {
				while((Date.now() - oldTime) < 5){
					if(elm = asq.shift())
						syncAttributes(elm);
					else
						break;
				}
			}
		}
		function ani(timestamp){
			if(isRun) 
				window.requestIdleCallback(callback, { timeout: 6 });
			else
				clearQueue();
				
			
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
				
				win.getComputedStyle = function(elm, option){
					elm.__getVE();
					getComputedStyle(elm, option);
				}
				
				var initVE = function(elm){
					if(!elm.__VE){
						var tagName = elm.tagName.toUpperCase();
						var html;
						
						if(tagName == "TD" || tagName == "TH"){
							html = "<table><tr><"+ tagName+"/></tr></table>";
						}else if(tagName == "TR" || tagName == "THEAD" || tagName == "TBODY" || tagName == "TFOOT"){
							html = "<table><"+ tagName+"/></table>";
						}else {
							html = "<"+ tagName+"/>";
						}
						ve = elm.__VE = parser.parseFromString(html, "text/html").getElementsByTagName(tagName)[0];
						ve.__version = version;
						ve.__changeStyle = false;
						var attributes = elm.attributes;
						for(var i = 0 ; i < attributes.length; i++){
							setAttr.call(ve, attributes[i].name, attributes[i].value);
						}
						
					}
				}

				
				elmProp.__getVE = function(){
					if(!this.__VE)
						initVE(this);
					
					if(this.__VE.__version != version){
						this.__VE.__version = version;
						syncAttributes(this, this.__VE);
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
					if(name == "style")
						ve.__changeStyle = true;
					if(sq.indexOf(this) < 0) sq.push(this);
				}
				
				elmProp.setAttribute = function(name, value){
					ve = this.__getVE();
					setAttr.call(ve, name, value);
					if(name == "style")
						ve.__changeStyle = true;
					if(sq.indexOf(this) < 0) sq.push(this);
				}
				
				Object.defineProperty(elmProp, 'style', {
					get: function(){
						if(!style.get.call(this).__elm)
							style.get.call(this).__elm = this;
							
						return style.get.call(this);
					},
					set: function(value){
						style.set.call(this.__getVE(), value);
						this.__elm.__getVE().__changeStyle = true;
						if(sq.indexOf(this) < 0) sq.push(this);
					}
				});
				
				Object.defineProperty(styleProp, 'cssText', {
					get: function(){
						return cssText.get.call(this);
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
