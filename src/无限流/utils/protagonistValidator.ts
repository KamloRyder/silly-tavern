// 主控信息验证工具

/**
 * 验证结果接口
 */
export interface ValidationResult {
  // 验证是否成功
  success: boolean;

  // 错误列表
  errors: string[];

  // 验证详情
  details: {
    globalVariablesValid: boolean;
    interceptorValid: boolean;
    nameMatch: boolean;
    descriptionMatch: boolean;
  };
}

/**
 * 主控信息验证器
 * 提供验证主控信息是否正确设置的工具函数
 */
export class ProtagonistValidator {
  /**
   * 验证全局变量中的主控信息
   * @param expectedName 期望的主控名称
   * @param expectedDescription 期望的主控描述
   * @returns 是否验证成功
   */
  static validateGlobalVariables(expectedName: string, expectedDescription: string): boolean {
    try {
      console.log('[ProtagonistValidator] 开始验证全局变量...');

      // 获取全局变量
      const globalVars = getVariables({ type: 'global' });
      console.log('[ProtagonistValidator] 全局变量获取成功');

      // 检查 player_name
      const actualName = globalVars.player_name;
      const nameMatch = actualName === expectedName;

      if (!nameMatch) {
        console.error('[ProtagonistValidator] ❌ player_name 不匹配:', {
          expected: expectedName,
          actual: actualName,
        });
        return false;
      }

      console.log('[ProtagonistValidator] ✅ player_name 匹配:', actualName);

      // 检查 player_description
      const actualDescription = globalVars.player_description;
      const descriptionMatch = actualDescription === expectedDescription;

      if (!descriptionMatch) {
        console.error('[ProtagonistValidator] ❌ player_description 不匹配:', {
          expected: `${expectedDescription.substring(0, 50)}...`,
          actual: actualDescription ? `${actualDescription.substring(0, 50)}...` : undefined,
          expectedLength: expectedDescription.length,
          actualLength: actualDescription?.length,
        });
        return false;
      }

      console.log('[ProtagonistValidator] ✅ player_description 匹配，长度:', actualDescription.length);

      console.log('[ProtagonistValidator] ✅ 全局变量验证通过');
      return true;
    } catch (error) {
      console.error('[ProtagonistValidator] ❌ 全局变量验证失败:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      return false;
    }
  }

  /**
   * 验证 SillyTavern 拦截器
   * @param expectedName 期望的主控名称
   * @param expectedDescription 期望的主控描述
   * @returns 是否验证成功
   */
  static validateInterceptor(expectedName: string, expectedDescription: string): boolean {
    try {
      console.log('[ProtagonistValidator] 开始验证拦截器...');

      const st = SillyTavern as any;

      // 验证 getUserName
      if (typeof st.getUserName === 'function') {
        const actualName = st.getUserName();
        const nameMatch = actualName === expectedName;

        if (!nameMatch) {
          console.error('[ProtagonistValidator] ❌ getUserName() 返回值不匹配:', {
            expected: expectedName,
            actual: actualName,
          });
          return false;
        }

        console.log('[ProtagonistValidator] ✅ getUserName() 返回正确:', actualName);
      } else {
        console.warn('[ProtagonistValidator] ⚠️ getUserName 不是函数，拦截器可能未设置');
        // 不返回 false，因为拦截器可能还没有设置
      }

      // 验证 getPersonaDescription
      if (typeof st.getPersonaDescription === 'function') {
        const actualDescription = st.getPersonaDescription();
        const descriptionMatch = actualDescription === expectedDescription;

        if (!descriptionMatch) {
          console.error('[ProtagonistValidator] ❌ getPersonaDescription() 返回值不匹配:', {
            expected: `${expectedDescription.substring(0, 50)}...`,
            actual: actualDescription ? `${actualDescription.substring(0, 50)}...` : undefined,
            expectedLength: expectedDescription.length,
            actualLength: actualDescription?.length,
          });
          return false;
        }

        console.log('[ProtagonistValidator] ✅ getPersonaDescription() 返回正确，长度:', actualDescription.length);
      } else {
        console.warn('[ProtagonistValidator] ⚠️ getPersonaDescription 不是函数，拦截器可能未设置');
        // 不返回 false，因为拦截器可能还没有设置
      }

      // 验证 powerUserSettings 属性
      if (st.powerUserSettings) {
        const actualName = st.powerUserSettings.name;
        const nameMatch = actualName === expectedName;

        if (!nameMatch) {
          console.error('[ProtagonistValidator] ❌ powerUserSettings.name 不匹配:', {
            expected: expectedName,
            actual: actualName,
          });
          return false;
        }

        console.log('[ProtagonistValidator] ✅ powerUserSettings.name 正确:', actualName);

        const actualDescription = st.powerUserSettings.persona_description;
        const descriptionMatch = actualDescription === expectedDescription;

        if (!descriptionMatch) {
          console.error('[ProtagonistValidator] ❌ powerUserSettings.persona_description 不匹配:', {
            expected: `${expectedDescription.substring(0, 50)}...`,
            actual: actualDescription ? `${actualDescription.substring(0, 50)}...` : undefined,
            expectedLength: expectedDescription.length,
            actualLength: actualDescription?.length,
          });
          return false;
        }

        console.log(
          '[ProtagonistValidator] ✅ powerUserSettings.persona_description 正确，长度:',
          actualDescription.length,
        );
      } else {
        console.warn('[ProtagonistValidator] ⚠️ powerUserSettings 不存在');
        // 不返回 false，因为这可能是正常情况
      }

      // 检查是否至少有一个验证方法成功
      const hasValidMethod =
        (typeof st.getUserName === 'function' && st.getUserName() === expectedName) ||
        (typeof st.getPersonaDescription === 'function' && st.getPersonaDescription() === expectedDescription) ||
        (st.powerUserSettings && st.powerUserSettings.name === expectedName);

      if (!hasValidMethod) {
        console.error('[ProtagonistValidator] ❌ 所有拦截器方法都未正确设置');
        return false;
      }

      console.log('[ProtagonistValidator] ✅ 拦截器验证通过');
      return true;
    } catch (error) {
      console.error('[ProtagonistValidator] ❌ 拦截器验证失败:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      return false;
    }
  }

  /**
   * 完整验证主控信息
   * @param expectedName 期望的主控名称
   * @param expectedDescription 期望的主控描述
   * @returns 验证结果
   */
  static validate(expectedName: string, expectedDescription: string): ValidationResult {
    console.log('[ProtagonistValidator] ========== 开始完整验证 ==========');
    console.log('[ProtagonistValidator] 期望的主控名称:', expectedName);
    console.log('[ProtagonistValidator] 期望的描述长度:', expectedDescription.length);

    const errors: string[] = [];
    const details = {
      globalVariablesValid: false,
      interceptorValid: false,
      nameMatch: false,
      descriptionMatch: false,
    };

    // 验证全局变量
    const globalVarsValid = this.validateGlobalVariables(expectedName, expectedDescription);
    details.globalVariablesValid = globalVarsValid;

    if (!globalVarsValid) {
      errors.push('全局变量中的主控信息不正确');

      // 详细检查哪个字段不匹配
      try {
        const globalVars = getVariables({ type: 'global' });
        const actualName = globalVars.player_name;
        const actualDescription = globalVars.player_description;

        details.nameMatch = actualName === expectedName;
        details.descriptionMatch = actualDescription === expectedDescription;

        if (!details.nameMatch) {
          errors.push(`player_name 不匹配: 期望 "${expectedName}", 实际 "${actualName}"`);
        }

        if (!details.descriptionMatch) {
          errors.push(
            `player_description 不匹配: 期望长度 ${expectedDescription.length}, 实际长度 ${actualDescription?.length || 0}`,
          );
        }
      } catch (error) {
        errors.push(`无法读取全局变量: ${(error as Error).message}`);
      }
    } else {
      details.nameMatch = true;
      details.descriptionMatch = true;
    }

    // 验证拦截器
    const interceptorValid = this.validateInterceptor(expectedName, expectedDescription);
    details.interceptorValid = interceptorValid;

    if (!interceptorValid) {
      errors.push('SillyTavern 拦截器未正确设置');
    }

    // 汇总结果
    const success = globalVarsValid && interceptorValid;

    if (success) {
      console.log('[ProtagonistValidator] ✅✅✅ 完整验证通过');
    } else {
      console.error('[ProtagonistValidator] ❌❌❌ 完整验证失败:', {
        errors,
        details,
      });
    }

    console.log('[ProtagonistValidator] ========== 验证完成 ==========');

    return {
      success,
      errors,
      details,
    };
  }
}
