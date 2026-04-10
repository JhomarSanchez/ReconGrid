; ReconGrid NSIS Installer Script
; Este archivo contiene configuraciones personalizadas para el instalador

!macro customInit
  ; Inicialización personalizada del instalador
!macroend

!macro customInstall
  ; Acciones personalizadas después de la instalación
  ; Por ejemplo, crear accesos directos adicionales o configurar registros
!macroend

!macro customUnInstall
  ; Acciones personalizadas durante la desinstalación
  ; Limpieza de archivos adicionales si es necesario
!macroend

!macro customInstallMode
  ; Usar modo de instalación por usuario por defecto
  ; StrCpy $InstMode "CurrentUser"
!macroend
