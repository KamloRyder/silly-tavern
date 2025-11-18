// GSAP 动画工具函数

import gsap from 'gsap';

/**
 * 淡入动画
 * @param element 目标元素
 * @param duration 持续时间（秒）
 * @param onComplete 完成回调
 */
export function fadeIn(
  element: HTMLElement | string,
  duration: number = 0.5,
  onComplete?: () => void,
): gsap.core.Tween {
  return gsap.fromTo(
    element,
    { opacity: 0 },
    {
      opacity: 1,
      duration,
      ease: 'power2.out',
      onComplete,
    },
  );
}

/**
 * 淡出动画
 * @param element 目标元素
 * @param duration 持续时间（秒）
 * @param onComplete 完成回调
 */
export function fadeOut(
  element: HTMLElement | string,
  duration: number = 0.5,
  onComplete?: () => void,
): gsap.core.Tween {
  return gsap.to(element, {
    opacity: 0,
    duration,
    ease: 'power2.in',
    onComplete,
  });
}

/**
 * 交叉淡入淡出（先淡出再淡入）
 * @param element 目标元素
 * @param onSwitch 切换时的回调（在淡出完成、淡入开始前执行）
 * @param duration 单次淡入/淡出的持续时间（秒）
 */
export function crossFade(
  element: HTMLElement | string,
  onSwitch: () => void,
  duration: number = 0.5,
): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(element, {
    opacity: 0,
    duration,
    ease: 'power2.in',
  })
    .call(onSwitch)
    .to(element, {
      opacity: 1,
      duration,
      ease: 'power2.out',
    });

  return tl;
}

/**
 * 数字滚动动画
 * @param element 目标元素
 * @param from 起始值
 * @param to 目标值
 * @param duration 持续时间（秒）
 * @param decimals 小数位数
 */
export function animateNumber(
  element: HTMLElement | string,
  from: number,
  to: number,
  duration: number = 1,
  decimals: number = 0,
): gsap.core.Tween {
  const obj = { value: from };

  return gsap.to(obj, {
    value: to,
    duration,
    ease: 'power2.out',
    onUpdate: () => {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (el) {
        el.textContent = obj.value.toFixed(decimals);
      }
    },
  });
}

/**
 * 按钮点击反馈动画
 * @param element 目标元素
 */
export function buttonClickFeedback(element: HTMLElement | string): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(element, {
    scale: 0.95,
    duration: 0.1,
    ease: 'power2.in',
  }).to(element, {
    scale: 1,
    duration: 0.1,
    ease: 'power2.out',
  });

  return tl;
}

/**
 * 震动动画
 * @param element 目标元素
 * @param intensity 震动强度（像素）
 * @param duration 持续时间（秒）
 */
export function shake(
  element: HTMLElement | string,
  intensity: number = 10,
  duration: number = 0.5,
): gsap.core.Timeline {
  const tl = gsap.timeline();

  const shakeCount = 8;
  const shakeDuration = duration / shakeCount;

  for (let i = 0; i < shakeCount; i++) {
    const x = (Math.random() - 0.5) * intensity * 2;
    const y = (Math.random() - 0.5) * intensity * 2;

    tl.to(element, {
      x,
      y,
      duration: shakeDuration,
      ease: 'power2.inOut',
    });
  }

  tl.to(element, {
    x: 0,
    y: 0,
    duration: shakeDuration,
    ease: 'power2.out',
  });

  return tl;
}

/**
 * 弹出动画
 * @param element 目标元素
 * @param duration 持续时间（秒）
 */
export function popIn(element: HTMLElement | string, duration: number = 0.3): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.fromTo(
    element,
    {
      scale: 0,
      opacity: 0,
    },
    {
      scale: 1,
      opacity: 1,
      duration,
      ease: 'back.out(1.7)',
    },
  );

  return tl;
}

/**
 * 滑入动画
 * @param element 目标元素
 * @param direction 滑入方向
 * @param distance 滑动距离（像素）
 * @param duration 持续时间（秒）
 */
export function slideIn(
  element: HTMLElement | string,
  direction: 'left' | 'right' | 'top' | 'bottom' = 'bottom',
  distance: number = 100,
  duration: number = 0.5,
): gsap.core.Tween {
  const fromVars: gsap.TweenVars = { opacity: 0 };
  const toVars: gsap.TweenVars = { opacity: 1, duration, ease: 'power2.out' };

  switch (direction) {
    case 'left':
      fromVars.x = -distance;
      toVars.x = 0;
      break;
    case 'right':
      fromVars.x = distance;
      toVars.x = 0;
      break;
    case 'top':
      fromVars.y = -distance;
      toVars.y = 0;
      break;
    case 'bottom':
      fromVars.y = distance;
      toVars.y = 0;
      break;
  }

  return gsap.fromTo(element, fromVars, toVars);
}

/**
 * 高亮闪烁动画（用于状态变化提示）
 * @param element 目标元素
 * @param color 高亮颜色
 * @param duration 持续时间（秒）
 */
export function highlightFlash(
  element: HTMLElement | string,
  color: string = '#d4af37',
  duration: number = 0.5,
): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.to(element, {
    backgroundColor: color,
    duration: duration / 2,
    ease: 'power2.out',
  }).to(element, {
    backgroundColor: 'transparent',
    duration: duration / 2,
    ease: 'power2.in',
  });

  return tl;
}

/**
 * 伤害数字飘出动画
 * @param element 目标元素
 * @param duration 持续时间（秒）
 */
export function damageNumberFloat(element: HTMLElement | string, duration: number = 1.5): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.fromTo(
    element,
    {
      y: 0,
      opacity: 1,
      scale: 1,
    },
    {
      y: -50,
      opacity: 0,
      scale: 1.5,
      duration,
      ease: 'power2.out',
    },
  );

  return tl;
}

/**
 * 打字机效果（逐字显示文本）
 * @param element 目标元素
 * @param text 要显示的文本
 * @param speed 打字速度（字符/秒）
 * @param onComplete 完成回调
 */
export function typewriter(
  element: HTMLElement | string,
  text: string,
  speed: number = 30,
  onComplete?: () => void,
): gsap.core.Tween {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) {
    throw new Error('Element not found');
  }

  const duration = text.length / speed;
  const obj = { progress: 0 };

  return gsap.to(obj, {
    progress: text.length,
    duration,
    ease: 'none',
    onUpdate: () => {
      const currentLength = Math.floor(obj.progress);
      el.textContent = text.substring(0, currentLength);
    },
    onComplete,
  });
}

/**
 * 脉冲动画（持续缩放）
 * @param element 目标元素
 * @param scale 缩放比例
 * @param duration 单次脉冲持续时间（秒）
 */
export function pulse(element: HTMLElement | string, scale: number = 1.1, duration: number = 0.8): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1, yoyo: true });

  tl.to(element, {
    scale,
    duration,
    ease: 'power2.inOut',
  });

  return tl;
}

/**
 * 设置元素的 will-change 属性以优化动画性能
 * @param element 目标元素
 * @param properties CSS 属性列表
 */
export function optimizeForAnimation(
  element: HTMLElement | string,
  properties: string[] = ['transform', 'opacity'],
): void {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el instanceof HTMLElement) {
    el.style.willChange = properties.join(', ');
  }
}

/**
 * 清除 will-change 属性
 * @param element 目标元素
 */
export function clearAnimationOptimization(element: HTMLElement | string): void {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el instanceof HTMLElement) {
    el.style.willChange = 'auto';
  }
}
