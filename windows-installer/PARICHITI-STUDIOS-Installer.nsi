Unicode true
!include "MUI2.nsh"
!include "x64.nsh"

; ==============================================================================
; PARICHITI STUDIOS - Professional Windows Setup Wizard (NSIS)
; ==============================================================================

; General
Name "PARICHITI STUDIOS"
OutFile "PARICHITI-STUDIOS-Setup.exe"
InstallDir "$PROGRAMFILES64\PARICHITI STUDIOS"
InstallDirRegKey HKLM "Software\PARICHITI STUDIOS" "Install_Dir"
RequestExecutionLevel admin
BrandingText "PARICHITI STUDIOS - Official Desktop Edition"

; High Solid LZMA Compression
SetCompressor /SOLID lzma

; Icons
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"

; Modern UI Configuration
!define MUI_ABORTWARNING

; Header and Banner Style
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT

; ------------------------------------------------------------------------------
; Wizard Pages (Photoshop / Professional Software Style)
; ------------------------------------------------------------------------------

; 1. Welcome Page
!define MUI_WELCOMEPAGE_TITLE "Welcome to PARICHITI STUDIOS Setup Wizard"
!define MUI_WELCOMEPAGE_TEXT "This setup wizard will install PARICHITI STUDIOS on your computer.$\r$\n$\r$\nPARICHITI STUDIOS is an all-in-one professional photo studio suite designed for Indian Passport (35x45mm), PAN Card, Stamp Size, and Visa photos with 100% offline AI background removal and 300 DPI A4 printing.$\r$\n$\r$\nClick Next to continue."
!insertmacro MUI_PAGE_WELCOME

; 2. Installation Directory Selection Page
!define MUI_DIRECTORYPAGE_TEXT_TOP "Setup will install PARICHITI STUDIOS in the following folder.$\r$\n$\r$\nTo install in a different folder, click Browse and select another folder. Click Next to continue."
!insertmacro MUI_PAGE_DIRECTORY

; 3. Installation Progress Page
!insertmacro MUI_PAGE_INSTFILES

; 4. Finish Page with Launch Option
!define MUI_FINISHPAGE_TITLE "PARICHITI STUDIOS Installation Completed"
!define MUI_FINISHPAGE_TEXT "PARICHITI STUDIOS has been successfully installed on your computer.$\r$\n$\r$\nShortcuts have been created on your Desktop and Start Menu.$\r$\n$\r$\nClick Finish to close this wizard."
!define MUI_FINISHPAGE_RUN "$INSTDIR\PARICHITI STUDIOS.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch PARICHITI STUDIOS now"
!insertmacro MUI_PAGE_FINISH

; Uninstallation Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

; Version Information
VIProductVersion "2.1.0.0"
VIFileVersion "2.1.0.0"
VIAddVersionKey "ProductName" "PARICHITI STUDIOS"
VIAddVersionKey "CompanyName" "PARICHITI STUDIOS"
VIAddVersionKey "FileDescription" "PARICHITI STUDIOS Setup Wizard"
VIAddVersionKey "LegalCopyright" "Copyright (C) 2026 Parichiti Digital Services"
VIAddVersionKey "FileVersion" "2.1.0"
VIAddVersionKey "ProductVersion" "2.1.0"

; ------------------------------------------------------------------------------
; Installation Section
; ------------------------------------------------------------------------------
Section "PARICHITI STUDIOS" SecMain
    SectionIn RO
    
    ${If} ${RunningX64}
        SetRegView 64
    ${EndIf}
    
    SetOutPath "$INSTDIR"
    
    ; Copy all application files recursively
    File /r "Parichiti Studios Windows App\*.*"
    
    ; Store install location in registry
    WriteRegStr HKLM "Software\PARICHITI STUDIOS" "Install_Dir" "$INSTDIR"
    
    ; Create Uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    
    ; Create Start Menu Shortcuts
    CreateDirectory "$SMPROGRAMS\PARICHITI STUDIOS"
    CreateShortcut "$SMPROGRAMS\PARICHITI STUDIOS\PARICHITI STUDIOS.lnk" "$INSTDIR\PARICHITI STUDIOS.exe" "" "$INSTDIR\icon.ico" 0
    CreateShortcut "$SMPROGRAMS\PARICHITI STUDIOS\Uninstall PARICHITI STUDIOS.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\icon.ico" 0
    
    ; Create Desktop Shortcut
    CreateShortcut "$DESKTOP\PARICHITI STUDIOS.lnk" "$INSTDIR\PARICHITI STUDIOS.exe" "" "$INSTDIR\icon.ico" 0
    
    ; Register in Windows Add/Remove Programs (Control Panel)
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PARICHITI STUDIOS" "DisplayName" "PARICHITI STUDIOS"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PARICHITI STUDIOS" "Publisher" "PARICHITI STUDIOS"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PARICHITI STUDIOS" "DisplayIcon" "$INSTDIR\icon.ico,0"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PARICHITI STUDIOS" "DisplayVersion" "2.1.0"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PARICHITI STUDIOS" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PARICHITI STUDIOS" "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PARICHITI STUDIOS" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PARICHITI STUDIOS" "NoRepair" 1
SectionEnd

; ------------------------------------------------------------------------------
; Uninstallation Section
; ------------------------------------------------------------------------------
Section "Uninstall"
    ${If} ${RunningX64}
        SetRegView 64
    ${EndIf}
    
    ; Remove Desktop and Start Menu Shortcuts
    Delete "$DESKTOP\PARICHITI STUDIOS.lnk"
    Delete "$SMPROGRAMS\PARICHITI STUDIOS\PARICHITI STUDIOS.lnk"
    Delete "$SMPROGRAMS\PARICHITI STUDIOS\Uninstall PARICHITI STUDIOS.lnk"
    RMDir "$SMPROGRAMS\PARICHITI STUDIOS"
    
    ; Remove Registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PARICHITI STUDIOS"
    DeleteRegKey HKLM "Software\PARICHITI STUDIOS"
    
    ; Remove Installed files and directory
    RMDir /r "$INSTDIR"
SectionEnd
