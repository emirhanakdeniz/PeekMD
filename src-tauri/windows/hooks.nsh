; NSIS Installer Hooks for PeekMD
; Ensures running app check, desktop shortcut, and custom Markdown document icon registration

!macro NSIS_HOOK_PREINSTALL
  !insertmacro CheckIfAppIsRunning "PeekMD.exe" "PeekMD"
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Create Desktop shortcut
  CreateShortcut "$DESKTOP\PeekMD.lnk" "$INSTDIR\PeekMD.exe" "" "$INSTDIR\PeekMD.exe" 0

  ; Register ProgID for Markdown Document
  WriteRegStr HKCU "Software\Classes\PeekMD.md" "" "Markdown Document"
  WriteRegStr HKCU "Software\Classes\PeekMD.md\DefaultIcon" "" "$INSTDIR\icons\document.ico,0"
  WriteRegStr HKCU "Software\Classes\PeekMD.md\shell\open\command" "" '"$INSTDIR\PeekMD.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\PeekMD.md\shell\open" "FriendlyAppName" "PeekMD"

  WriteRegStr HKCU "Software\Classes\PeekMD.markdown" "" "Markdown Document"
  WriteRegStr HKCU "Software\Classes\PeekMD.markdown\DefaultIcon" "" "$INSTDIR\icons\document.ico,0"
  WriteRegStr HKCU "Software\Classes\PeekMD.markdown\shell\open\command" "" '"$INSTDIR\PeekMD.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\PeekMD.markdown\shell\open" "FriendlyAppName" "PeekMD"

  ; Register OpenWithProgids
  WriteRegStr HKCU "Software\Classes\.md\OpenWithProgids" "PeekMD.md" ""
  WriteRegStr HKCU "Software\Classes\.markdown\OpenWithProgids" "PeekMD.md" ""

  ; Register Application specifics
  WriteRegStr HKCU "Software\Classes\Applications\PeekMD.exe" "FriendlyAppName" "PeekMD"
  WriteRegStr HKCU "Software\Classes\Applications\PeekMD.exe\DefaultIcon" "" "$INSTDIR\icons\document.ico,0"
  WriteRegStr HKCU "Software\Classes\Applications\PeekMD.exe\SupportedTypes" ".md" ""
  WriteRegStr HKCU "Software\Classes\Applications\PeekMD.exe\SupportedTypes" ".markdown" ""
  WriteRegStr HKCU "Software\Classes\Applications\PeekMD.exe\shell\open\command" "" '"$INSTDIR\PeekMD.exe" "%1"'

  ; Register Capabilities for Windows Default Apps settings
  WriteRegStr HKCU "Software\PeekMD\Capabilities" "ApplicationName" "PeekMD"
  WriteRegStr HKCU "Software\PeekMD\Capabilities" "ApplicationDescription" "Lightweight Markdown Viewer"
  WriteRegStr HKCU "Software\PeekMD\Capabilities\FileAssociations" ".md" "PeekMD.md"
  WriteRegStr HKCU "Software\PeekMD\Capabilities\FileAssociations" ".markdown" "PeekMD.md"
  WriteRegStr HKCU "Software\RegisteredApplications" "PeekMD" "Software\PeekMD\Capabilities"

  ; Refresh Windows Shell Icon Cache immediately
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro CheckIfAppIsRunning "PeekMD.exe" "PeekMD"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Remove Desktop shortcut
  Delete "$DESKTOP\PeekMD.lnk"

  ; Remove custom ProgID and registry keys
  DeleteRegKey HKCU "Software\Classes\PeekMD.md"
  DeleteRegKey HKCU "Software\Classes\PeekMD.markdown"
  DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "PeekMD.md"
  DeleteRegValue HKCU "Software\Classes\.markdown\OpenWithProgids" "PeekMD.md"
  DeleteRegKey HKCU "Software\Classes\Applications\PeekMD.exe"
  DeleteRegKey HKCU "Software\PeekMD"
  DeleteRegValue HKCU "Software\RegisteredApplications" "PeekMD"

  ; Refresh Windows Shell Icon Cache
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
