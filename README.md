"# vrjs" 

## 개요
    * DOM Rendering을 최소화 하기 위한 라이브러리
* * *

## 기술적 방법

애니메이션 및 DOM 스타일변경이 자주 일어나고 대체로 중복된 스타일 변경이라던지 너무 잦은 변경이라 인간이 인지할 수도 없을 정도로 지나가는 것들이 많다는 것에 기인하였다.

    * CSSOM에 영향을 발생시키는 로직(element.attribute, element.class, style.prop)을 즉시 실행시키지 않는다.
    * Virtual CSSStyleDeclaration를 이용하여 가상으로 렌더링한다.
    * 동기화를 해야하는 DOM을 Queue에 넣는다.
    * requestAnimationFrame를 이용하여 가상 CSSStyleDeclaration과 실제 CSSStyleDeclaration을 동기화한다.
* * *

## 알아낸 사실

    * style.prop을 여러개 나열하는 것보다 DOM.attr(style, "...")로 한번에 랜더링하는 것이 더욱 빠르다.(더 테스트를 진행해봐야 함)
    * setTimeout(..., 16)을 이용하여 requestAnimationFrame과 유사하게 만들수는 있으나, Call Stack가 계속 쌓인다. 퍼포먼스에 영향을 주는지는 테스트 해보지 못함.
    * setinterval과 setTimeout을 이용하면 Call Stack 문제 없이 requestAnimationFrame 유사하게 만들수 있다.
  

