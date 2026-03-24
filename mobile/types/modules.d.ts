declare module 'react-native-feather' {
  import type { ComponentType } from 'react'
  import type { SvgProps } from 'react-native-svg'

  export type FeatherIcon = ComponentType<SvgProps>

  export const ChevronDown: FeatherIcon
}

declare module 'react-native-gesture-handler' {
  import type { ComponentType, PropsWithChildren } from 'react'
  import type { PressableProps, ViewProps } from 'react-native'

  export const Pressable: ComponentType<PropsWithChildren<PressableProps>>
  export const GestureHandlerRootView: ComponentType<PropsWithChildren<ViewProps>>
}
