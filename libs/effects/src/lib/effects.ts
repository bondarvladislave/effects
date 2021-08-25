import {Subject, takeUntil} from "rxjs";
import {Effect} from "./effect.model";
import {Action} from "./action.model";
import {actions} from "./actions";

interface EffectsConfig {
  logger?: any; // todo type
  dispatchByDefault?: boolean
}

class EffectsManager {
  private effects = new WeakMap<Effect, Subject<void>>()
  private destroyEffects$ = new Subject<void>()
  private config: EffectsConfig

  constructor(config?: EffectsConfig) {
    this.config = {
      // logger:
      dispatchByDefault: false,
      ...config
    }
  }

  registerEffects(effects: Effect[]) {
    effects.forEach(effect => {
      this.subscribeEffect(effect)
    })
  }

  removeEffects(effects: Effect[]) {
    effects.forEach(effect => {
      this.unsubscribeEffect(effect)
    })
  }

  removeAllEffects() {
    this.destroyEffects$.next()
  }

  private subscribeEffect(effect: Effect) {
    const disposer = new Subject<void>()
    this.effects.set(effect, disposer)

    effect.callback.pipe(
      takeUntil(this.destroyEffects$),
      takeUntil(disposer)
    ).subscribe(maybeAction => {
      this.dispatchAction(effect, maybeAction)
    })
  }

  private unsubscribeEffect(effect: Effect) {
    const disposer = this.effects.get(effect)
    disposer?.next()
    this.effects.delete(effect)
  }

  private dispatchAction(effect: Effect, maybeAction: Action) {
    if (effect.config?.dispatch || this.config.dispatchByDefault && checkAction(maybeAction)) {
      actions.dispatch(maybeAction)
    }
  }
}

function checkAction(action: Action | any): action is Action & Record<'type', any> {
  if (action.type) {
    return true;
  }
  throw new TypeError('Make sure to provide a valid action type or set the option {dispatch: false}');
}


export let effectsManager: EffectsManager

export function initEffects(config?: EffectsConfig) {
  return effectsManager = new EffectsManager(config)
}
