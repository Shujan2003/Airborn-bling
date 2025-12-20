# Quick Reference - Mobile Controls

## 🎮 Control Layout

```
                    ▲ UP (Pitch Up)
            
        ◄ LEFT          ↻ RESET          ► RIGHT
        (Yaw)           (Respawn)         (Yaw)
        
                    ▼ DOWN (Pitch Down)

┌─────────────────────────────────────────────────┐
│  🚀 TURBO              ◀◀ STRAFE LEFT           │
│  ⏸ SLOW               ▶▶ STRAFE RIGHT          │
│                                                 │
│           ◉ Toggle Controls (Top Right)        │
└─────────────────────────────────────────────────┘
```

## 📱 Device-Specific Behavior

| Screen Size | Controls | Layout | Optimized |
|-------------|----------|--------|-----------|
| > 768px (Desktop) | Hidden by default* | Multi-column menus | - |
| 601-768px (Tablet) | Visible | Full mobile layout | Yes |
| 481-600px (Large Phone) | Visible | Mobile layout | Yes |
| ≤ 480px (Small Phone) | Visible | Compact layout | Yes |
| Height ≤ 600px (Landscape) | Visible | Ultra-compact | Yes |

*Can be enabled manually for keyboard-free desktop play

## ⌨️ Key Mappings

| Mobile Button | Keyboard | Action |
|---------------|----------|--------|
| ▲ | W | Pitch Up |
| ▼ | S | Pitch Down |
| ◄ | A | Yaw Left |
| ► | D | Yaw Right |
| ↻ | R | Reset/Respawn |
| 🚀 | ↑ Arrow | Turbo Boost |
| ⏸ | ↓ Arrow | Slow Down |
| ◀◀ | ← Arrow | Strafe Left |
| ▶▶ | → Arrow | Strafe Right |

## 🎨 Button Colors

- **Blue**: Movement (WASD)
- **Green**: Reset
- **Orange**: Turbo
- **Purple**: Slow
- **Cyan**: Strafe
- **Gray**: Toggle

## ✨ Visual Feedback

- **Normal**: 75% opacity
- **Pressed**: 95% opacity + scaled down slightly
- **Transition**: Smooth 0.1s ease

## 🔧 Configuration

### To Disable Mobile Controls
In `src/components/MobileControls.jsx`:
```javascript
const [showControls, setShowControls] = useState(false); // Changed from isMobileDevice()
```

### To Change Button Sizes
In `src/styles/MobileControls.css`, adjust:
```css
.mobile-btn {
  width: 48px;  /* Change this */
  height: 48px; /* And this */
}
```

### To Change Breakpoints
Update media queries in `src/styles/MobileControls.css`:
```css
@media (max-width: 768px) { /* Change this value */ }
@media (max-width: 480px) { /* And this */ }
```

## 📍 Control Positioning

- **D-Pad**: Top Center (safe from notches)
- **Speed**: Bottom Right (thumb-friendly)
- **Strafe**: Bottom Left (thumb-friendly)
- **Toggle**: Top Right (easy access)

## 🚀 Testing

### Desktop Emulation
1. Open DevTools (F12)
2. Click device icon
3. Select any mobile device
4. Controls appear automatically

### Mobile Device
1. Open game URL on phone
2. Controls auto-detect and appear
3. Use toggle button to show/hide as needed

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Controls not appearing | Check if screen width < 768px |
| Buttons not responding | Verify JavaScript is enabled |
| Buttons stuck | Release and tap again (has failsafe) |
| Z-fighting with UI | Verify z-index values (8000+) |
| Text selection | This is disabled intentionally |

## 📊 Performance

- **Button Count**: 8 active buttons
- **DOM Elements**: 1 container + 8 buttons = 9 elements
- **Memory**: < 100KB
- **Rendering**: GPU-accelerated CSS transforms
- **Events**: Native touch/mouse events (optimized)

## 🌐 Browser Compatibility

✅ iOS Safari 11+  
✅ Android Chrome 60+  
✅ Android Firefox 60+  
✅ Samsung Internet 8+  
✅ All modern desktop browsers  

## 🎯 Tips for Players

1. **Tap and Hold**: Keep finger on button to maintain input
2. **Quick Taps**: For single movements, tap button
3. **Precision**: Use center reset button for quick orientation
4. **Speed**: Toggle turbo with rocket button
5. **Strafe**: Use side buttons to dodge obstacles
6. **Toggle**: Hide controls if they're in the way

## 📝 Notes

- Controls work on both portrait and landscape orientation
- All game mechanics are fully accessible via mobile buttons
- Keyboard support remains intact on desktop
- Mobile and keyboard inputs can be used simultaneously
- No performance degradation on any device

---

**Quick Start**: Open on mobile → Controls appear automatically → Enjoy!

For detailed technical info, see `MOBILE_IMPLEMENTATION.md`  
For feature overview, see `MOBILE_FEATURES.md`
