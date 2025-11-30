import sys
import os
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QTabWidget, QListWidget, QLabel, QLineEdit, QTextEdit, 
                             QPushButton, QComboBox, QCheckBox, QFileDialog, QSplitter,
                             QTreeWidget, QTreeWidgetItem, QMessageBox, QGroupBox, QScrollArea,
                             QGridLayout, QDialog)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QIcon, QPixmap, QPalette, QColor, QAction, QFont

from data_manager import DataManager
from emojis import EMOJI_DATA

class DarkPalette(QPalette):
    def __init__(self):
        super().__init__()
        self.setColor(QPalette.ColorRole.Window, QColor(53, 53, 53))
        self.setColor(QPalette.ColorRole.WindowText, Qt.GlobalColor.white)
        self.setColor(QPalette.ColorRole.Base, QColor(25, 25, 25))
        self.setColor(QPalette.ColorRole.AlternateBase, QColor(53, 53, 53))
        self.setColor(QPalette.ColorRole.ToolTipBase, Qt.GlobalColor.white)
        self.setColor(QPalette.ColorRole.ToolTipText, Qt.GlobalColor.white)
        self.setColor(QPalette.ColorRole.Text, Qt.GlobalColor.white)
        self.setColor(QPalette.ColorRole.Button, QColor(53, 53, 53))
        self.setColor(QPalette.ColorRole.ButtonText, Qt.GlobalColor.white)
        self.setColor(QPalette.ColorRole.BrightText, Qt.GlobalColor.red)
        self.setColor(QPalette.ColorRole.Link, QColor(42, 130, 218))
        self.setColor(QPalette.ColorRole.Highlight, QColor(42, 130, 218))
        self.setColor(QPalette.ColorRole.HighlightedText, Qt.GlobalColor.black)

class EmojiPickerDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Select Emoji")
        self.resize(800, 600)
        self.selected_emoji = None
        
        layout = QVBoxLayout(self)
        
        self.tabs = QTabWidget()
        
        font = QFont()
        font.setPointSize(24)
        
        for category, emojis in EMOJI_DATA.items():
            tab = QWidget()
            tab_layout = QVBoxLayout(tab)
            
            list_widget = QListWidget()
            list_widget.setViewMode(QListWidget.ViewMode.IconMode)
            list_widget.setResizeMode(QListWidget.ResizeMode.Adjust)
            list_widget.setSpacing(5)
            list_widget.setIconSize(QSize(40, 40)) # Dummy size for spacing
            
            for emoji in emojis:
                from PyQt6.QtWidgets import QListWidgetItem
                item = QListWidgetItem(emoji)
                item.setFont(font)
                item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                item.setSizeHint(QSize(50, 50))
                list_widget.addItem(item)
                
            list_widget.itemDoubleClicked.connect(self.on_item_double_clicked)
            tab_layout.addWidget(list_widget)
            
            self.tabs.addTab(tab, category)
            
        layout.addWidget(self.tabs)
        
        btn_layout = QHBoxLayout()
        self.cancel_btn = QPushButton("Cancel")
        self.cancel_btn.clicked.connect(self.reject)
        btn_layout.addWidget(self.cancel_btn)
        layout.addLayout(btn_layout)
        
    def on_item_double_clicked(self, item):
        self.selected_emoji = item.text()
        self.accept()

class TipsEditor(QWidget):
    def __init__(self, data_manager, save_callback=None, parent=None):
        super().__init__(parent)
        self.dm = data_manager
        self.save_callback = save_callback
        self.tips = []
        self.config = {}
        self.current_index = -1
        
        layout = QHBoxLayout(self)
        
        # Left: List and Settings
        left_layout = QVBoxLayout()
        
        left_layout.addWidget(QLabel("Site Tips:"))
        
        self.list_widget = QListWidget()
        self.list_widget.currentRowChanged.connect(self.on_selection_changed)
        left_layout.addWidget(self.list_widget)
        
        btn_layout = QHBoxLayout()
        self.add_btn = QPushButton("Add New Tip")
        self.add_btn.clicked.connect(self.add_tip)
        self.del_btn = QPushButton("Delete Tip")
        self.del_btn.clicked.connect(self.delete_tip)
        btn_layout.addWidget(self.add_btn)
        btn_layout.addWidget(self.del_btn)
        left_layout.addLayout(btn_layout)

        # Settings Group (Moved to bottom)
        settings_group = QGroupBox("Default Icon Settings")
        settings_layout = QGridLayout()
        settings_layout.addWidget(QLabel("Default Fallback Icon:"), 0, 0)
        
        icon_layout = QHBoxLayout()
        self.icon_edit = QLineEdit()
        self.icon_edit.setMaxLength(10)
        self.icon_edit.setToolTip("This icon is used for any tip that doesn't have its own specific icon set.")
        self.icon_edit.textChanged.connect(self.on_config_changed)
        
        self.pick_emoji_btn = QPushButton("Pick")
        self.pick_emoji_btn.clicked.connect(self.pick_default_emoji)
        
        icon_layout.addWidget(self.icon_edit)
        icon_layout.addWidget(self.pick_emoji_btn)
        
        settings_layout.addLayout(icon_layout, 0, 1)
        
        explanation = QLabel("Used when a tip has no specific icon.")
        explanation.setStyleSheet("color: gray; font-style: italic; font-size: 10px;")
        settings_layout.addWidget(explanation, 1, 0, 1, 2)

        settings_group.setLayout(settings_layout)
        left_layout.addWidget(settings_group)
        
        left_container = QWidget()
        left_container.setLayout(left_layout)
        
        # Right: Editor
        self.form_group = QGroupBox("Edit Tip")
        form_layout = QVBoxLayout()
        
        # Tip specific icon
        icon_form_layout = QHBoxLayout()
        icon_form_layout.addWidget(QLabel("Tip Icon Override:"))
        self.tip_icon_edit = QLineEdit()
        self.tip_icon_edit.setMaxLength(10)
        self.tip_icon_edit.setPlaceholderText("Leave empty to use default")
        icon_form_layout.addWidget(self.tip_icon_edit)
        
        self.pick_tip_emoji_btn = QPushButton("Pick")
        self.pick_tip_emoji_btn.clicked.connect(self.pick_tip_emoji)
        icon_form_layout.addWidget(self.pick_tip_emoji_btn)
        
        form_layout.addLayout(icon_form_layout)

        form_layout.addWidget(QLabel("Content:"))
        self.tip_edit = QTextEdit()
        form_layout.addWidget(self.tip_edit)
        
        self.save_btn = QPushButton("Save Changes")
        self.save_btn.clicked.connect(self.save_current)
        form_layout.addWidget(self.save_btn)
        
        self.form_group.setLayout(form_layout)
        self.form_group.setEnabled(False)
        
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(left_container)
        splitter.addWidget(self.form_group)
        splitter.setStretchFactor(1, 1)
        
        layout.addWidget(splitter)

    def pick_default_emoji(self):
        dialog = EmojiPickerDialog(self)
        if dialog.exec():
            if dialog.selected_emoji:
                self.icon_edit.setText(dialog.selected_emoji)

    def pick_tip_emoji(self):
        dialog = EmojiPickerDialog(self)
        if dialog.exec():
            if dialog.selected_emoji:
                self.tip_icon_edit.setText(dialog.selected_emoji)

    def load_data(self, tips, config):
        # Normalize tips to objects IN PLACE to maintain reference with MainWindow
        self.tips = tips
        for i in range(len(self.tips)):
            t = self.tips[i]
            if isinstance(t, str):
                self.tips[i] = {"text": t, "icon": ""}
            elif isinstance(t, dict):
                # Ensure keys exist
                if "text" not in t: self.tips[i]["text"] = ""
                if "icon" not in t: self.tips[i]["icon"] = ""
                
        self.config = config
        self.icon_edit.setText(self.config.get("tip_icon", "💡"))
        self.refresh_list()

    def refresh_list(self):
        self.list_widget.clear()
        for tip in self.tips:
            # Handle potential string if data corruption occurred or incomplete normalization
            if isinstance(tip, str):
                text = tip
                icon = ""
            else:
                text = tip.get("text", "")
                icon = tip.get("icon", "")
                
            # Truncate long tips for display
            display_text = text if len(text) < 50 else text[:47] + "..."
            
            if not icon:
                icon = self.config.get("tip_icon", "💡")
            self.list_widget.addItem(f"{icon} {display_text}")

    def on_selection_changed(self, row):
        if row < 0:
            self.form_group.setEnabled(False)
            self.tip_edit.clear()
            self.tip_icon_edit.clear()
            self.current_index = -1
            return
            
        self.current_index = row
        self.form_group.setEnabled(True)
        tip = self.tips[row]
        if isinstance(tip, str):
            self.tip_edit.setText(tip)
            self.tip_icon_edit.clear()
        else:
            self.tip_edit.setText(tip.get("text", ""))
            self.tip_icon_edit.setText(tip.get("icon", ""))
        
    def on_config_changed(self):
        self.config["tip_icon"] = self.icon_edit.text()
        self.refresh_list() # Update list icons
        if self.save_callback:
            pass

    def add_tip(self):
        self.tips.append({"text": "New Tip", "icon": ""})
        self.refresh_list()
        self.list_widget.setCurrentRow(len(self.tips) - 1)
        self.tip_edit.setFocus()
        self.tip_edit.selectAll()

    def delete_tip(self):
        row = self.list_widget.currentRow()
        if row < 0:
            return
            
        confirm = QMessageBox.question(self, "Delete", "Are you sure you want to delete this tip?", 
                                       QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if confirm == QMessageBox.StandardButton.Yes:
            self.tips.pop(row)
            self.refresh_list()
            self.save_callback()

    def save_current(self):
        if self.current_index < 0:
            return
            
        new_text = self.tip_edit.toPlainText().strip()
        new_icon = self.tip_icon_edit.text().strip()
        
        if not new_text:
            QMessageBox.warning(self, "Error", "Tip cannot be empty")
            return
            
        self.tips[self.current_index] = {
            "text": new_text,
            "icon": new_icon
        }
        self.refresh_list()
        # Reselect the item
        self.list_widget.setCurrentRow(self.current_index)
        
        if self.save_callback:
            self.save_callback()
        
        QMessageBox.information(self, "Saved", "Tip updated!")

class IngredientEditor(QWidget):
    def __init__(self, data_manager, save_callback=None, parent=None):
        super().__init__(parent)
        self.dm = data_manager
        self.save_callback = save_callback
        self.ingredients = {}
        self.current_ingredient_name = None
        
        layout = QHBoxLayout(self)
        
        # Left: List
        left_layout = QVBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search ingredients...")
        self.search_input.textChanged.connect(self.filter_list)
        left_layout.addWidget(self.search_input)
        
        self.list_widget = QListWidget()
        self.list_widget.currentItemChanged.connect(self.on_selection_changed)
        left_layout.addWidget(self.list_widget)
        
        btn_layout = QHBoxLayout()
        self.add_btn = QPushButton("Add New")
        self.add_btn.clicked.connect(self.add_ingredient)
        self.del_btn = QPushButton("Delete")
        self.del_btn.clicked.connect(self.delete_ingredient)
        btn_layout.addWidget(self.add_btn)
        btn_layout.addWidget(self.del_btn)
        left_layout.addLayout(btn_layout)
        
        left_container = QWidget()
        left_container.setLayout(left_layout)
        
        # Right: Form
        self.form_group = QGroupBox("Ingredient Details")
        form_layout = QGridLayout()
        
        form_layout.addWidget(QLabel("Name:"), 0, 0)
        self.name_edit = QLineEdit()
        form_layout.addWidget(self.name_edit, 0, 1)
        
        form_layout.addWidget(QLabel("Category:"), 1, 0)
        self.category_combo = QComboBox()
        self.category_combo.addItems(self.dm.get_ingredient_categories())
        form_layout.addWidget(self.category_combo, 1, 1)
        
        form_layout.addWidget(QLabel("Image:"), 2, 0)
        img_layout = QHBoxLayout()
        self.image_edit = QLineEdit()
        self.browse_btn = QPushButton("Browse")
        self.browse_btn.clicked.connect(self.browse_image)
        img_layout.addWidget(self.image_edit)
        img_layout.addWidget(self.browse_btn)
        form_layout.addLayout(img_layout, 2, 1)
        
        form_layout.addWidget(QLabel("Preview:"), 3, 0)
        self.image_preview = QLabel()
        self.image_preview.setFixedSize(128, 128)
        self.image_preview.setStyleSheet("border: 1px solid gray;")
        self.image_preview.setAlignment(Qt.AlignmentFlag.AlignCenter)
        form_layout.addWidget(self.image_preview, 3, 1)
        
        self.lto_check = QCheckBox("Is Limited Time Offer (LTO)?")
        form_layout.addWidget(self.lto_check, 4, 1)
        
        self.save_btn = QPushButton("Save Changes")
        self.save_btn.clicked.connect(self.save_current)
        form_layout.addWidget(self.save_btn, 5, 1)
        
        # Spacer
        form_layout.setRowStretch(6, 1)
        
        self.form_group.setLayout(form_layout)
        self.form_group.setEnabled(False)
        
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(left_container)
        splitter.addWidget(self.form_group)
        splitter.setStretchFactor(1, 1)
        
        layout.addWidget(splitter)
        
    def load_data(self, ingredients):
        self.ingredients = ingredients
        self.refresh_list()
        
    def refresh_list(self):
        self.list_widget.clear()
        search = self.search_input.text().lower()
        for name in sorted(self.ingredients.keys()):
            if search in name.lower():
                self.list_widget.addItem(name)
                
    def filter_list(self):
        self.refresh_list()
        
    def on_selection_changed(self, current, previous):
        if not current:
            self.form_group.setEnabled(False)
            self.current_ingredient_name = None
            return
            
        name = current.text()
        self.current_ingredient_name = name
        data = self.ingredients[name]
        
        self.form_group.setEnabled(True)
        self.name_edit.setText(name)
        
        idx = self.category_combo.findText(data.get('category', 'Meats'))
        if idx >= 0:
            self.category_combo.setCurrentIndex(idx)
            
        self.image_edit.setText(data.get('image', ''))
        self.lto_check.setChecked(data.get('is_lto', False))
        
        self.update_preview(data.get('image', ''))
        
    def update_preview(self, image_name):
        if not image_name:
            self.image_preview.clear()
            self.image_preview.setText("No Image")
            return
            
        path = os.path.join(self.dm.images_dir, image_name)
        if os.path.exists(path):
            pixmap = QPixmap(path)
            self.image_preview.setPixmap(pixmap.scaled(128, 128, Qt.AspectRatioMode.KeepAspectRatio))
        else:
            self.image_preview.clear()
            self.image_preview.setText("Not Found")
            
    def browse_image(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Select Image", "", "Images (*.png *.jpg *.jpeg)")
        if file_path:
            filename = self.dm.import_image(file_path)
            if filename:
                self.image_edit.setText(filename)
                self.update_preview(filename)
                
    def add_ingredient(self):
        name = "New Ingredient"
        count = 1
        while name in self.ingredients:
            name = f"New Ingredient {count}"
            count += 1
            
        self.ingredients[name] = {
            "category": "Meats",
            "image": "",
            "is_lto": False
        }
        self.refresh_list()
        # Select the new item
        items = self.list_widget.findItems(name, Qt.MatchFlag.MatchExactly)
        if items:
            self.list_widget.setCurrentItem(items[0])
            self.name_edit.setFocus()
            
    def delete_ingredient(self):
        item = self.list_widget.currentItem()
        if not item:
            return
            
        name = item.text()
        reply = QMessageBox.question(self, "Confirm Delete", 
                                     f"Are you sure you want to delete '{name}'?",
                                     QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        
        if reply == QMessageBox.StandardButton.Yes:
            del self.ingredients[name]
            self.refresh_list()
            self.form_group.setEnabled(False)
            
    def save_current(self):
        if not self.current_ingredient_name:
            return
            
        new_name = self.name_edit.text().strip()
        if not new_name:
            QMessageBox.warning(self, "Error", "Name cannot be empty")
            return
            
        if new_name != self.current_ingredient_name and new_name in self.ingredients:
            QMessageBox.warning(self, "Error", "Ingredient name already exists")
            return
            
        # Update data
        data = {
            "category": self.category_combo.currentText(),
            "image": self.image_edit.text(),
            "is_lto": self.lto_check.isChecked()
        }
        
        if new_name != self.current_ingredient_name:
            del self.ingredients[self.current_ingredient_name]
            self.ingredients[new_name] = data
            self.current_ingredient_name = new_name
            self.refresh_list()
            items = self.list_widget.findItems(new_name, Qt.MatchFlag.MatchExactly)
            if items:
                self.list_widget.setCurrentItem(items[0])
        else:
            self.ingredients[new_name] = data
            
        # Signal that data changed
        if self.save_callback:
            self.save_callback()

class SubEditor(QWidget):
    def __init__(self, data_manager, save_callback=None, parent=None):
        super().__init__(parent)
        self.dm = data_manager
        self.save_callback = save_callback
        self.subs = {} # dict[category] -> list[sub]
        self.all_ingredients = {}
        self.current_sub = None # Reference to the sub dict
        self.current_category = None
        self.current_index = -1
        
        layout = QHBoxLayout(self)
        
        # Left: Tree
        left_layout = QVBoxLayout()
        self.tree = QTreeWidget()
        self.tree.setHeaderLabel("Subs by Category")
        self.tree.currentItemChanged.connect(self.on_selection_changed)
        left_layout.addWidget(self.tree)
        
        btn_layout = QHBoxLayout()
        self.add_cat_btn = QPushButton("Add Category")
        self.add_cat_btn.clicked.connect(self.add_category)
        self.add_sub_btn = QPushButton("Add Sub")
        self.add_sub_btn.clicked.connect(self.add_sub)
        self.del_btn = QPushButton("Delete")
        self.del_btn.clicked.connect(self.delete_item)
        btn_layout.addWidget(self.add_cat_btn)
        btn_layout.addWidget(self.add_sub_btn)
        btn_layout.addWidget(self.del_btn)
        left_layout.addLayout(btn_layout)
        
        left_container = QWidget()
        left_container.setLayout(left_layout)
        
        # Right: Form
        self.form_group = QGroupBox("Sub Details")
        form_layout = QGridLayout()
        
        form_layout.addWidget(QLabel("Name:"), 0, 0)
        self.name_edit = QLineEdit()
        form_layout.addWidget(self.name_edit, 0, 1)
        
        form_layout.addWidget(QLabel("Tip:"), 1, 0)
        self.tip_edit = QTextEdit()
        self.tip_edit.setMaximumHeight(60)
        form_layout.addWidget(self.tip_edit, 1, 1)
        
        form_layout.addWidget(QLabel("Image:"), 2, 0)
        img_layout = QHBoxLayout()
        self.image_edit = QLineEdit()
        self.browse_btn = QPushButton("Browse")
        self.browse_btn.clicked.connect(self.browse_image)
        img_layout.addWidget(self.image_edit)
        img_layout.addWidget(self.browse_btn)
        form_layout.addLayout(img_layout, 2, 1)
        
        form_layout.addWidget(QLabel("Category:"), 3, 0)
        self.cat_combo = QComboBox()
        # We populate this dynamically
        form_layout.addWidget(self.cat_combo, 3, 1)
        
        # Ingredients Editor
        ing_group = QGroupBox("Ingredients")
        ing_layout = QHBoxLayout()
        
        # Current Ingredients
        v1 = QVBoxLayout()
        v1.addWidget(QLabel("Current:"))
        self.current_ings_list = QListWidget()
        self.current_ings_list.setDragDropMode(QListWidget.DragDropMode.InternalMove)
        v1.addWidget(self.current_ings_list)
        self.remove_ing_btn = QPushButton("Remove Selected")
        self.remove_ing_btn.clicked.connect(self.remove_ingredient)
        v1.addWidget(self.remove_ing_btn)
        
        # Available Ingredients
        v2 = QVBoxLayout()
        v2.addWidget(QLabel("Available:"))
        self.avail_ings_filter = QLineEdit()
        self.avail_ings_filter.setPlaceholderText("Filter...")
        self.avail_ings_filter.textChanged.connect(self.filter_avail_ings)
        v2.addWidget(self.avail_ings_filter)
        
        self.avail_ings_list = QListWidget()
        self.avail_ings_list.itemDoubleClicked.connect(self.add_ingredient_from_list)
        v2.addWidget(self.avail_ings_list)
        self.add_ing_btn = QPushButton("Add <<")
        self.add_ing_btn.clicked.connect(self.add_ingredient_btn)
        v2.addWidget(self.add_ing_btn)
        
        ing_layout.addLayout(v1)
        ing_layout.addLayout(v2)
        ing_group.setLayout(ing_layout)
        
        form_layout.addWidget(ing_group, 4, 0, 1, 2)
        
        self.save_btn = QPushButton("Save Sub Changes")
        self.save_btn.clicked.connect(self.save_current)
        form_layout.addWidget(self.save_btn, 5, 1)
        
        self.form_group.setLayout(form_layout)
        self.form_group.setEnabled(False)
        
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(left_container)
        splitter.addWidget(self.form_group)
        splitter.setStretchFactor(1, 1)
        
        layout.addWidget(splitter)

    def load_data(self, subs, ingredients):
        self.subs = subs
        self.all_ingredients = ingredients
        self.refresh_tree()
        self.refresh_avail_ingredients()
        
    def refresh_tree(self):
        self.tree.clear()
        self.cat_combo.clear()
        
        categories = sorted(self.subs.keys())
        self.cat_combo.addItems(categories)
        
        for cat in categories:
            cat_item = QTreeWidgetItem(self.tree)
            cat_item.setText(0, cat)
            cat_item.setData(0, Qt.ItemDataRole.UserRole, "category")
            
            for i, sub in enumerate(self.subs[cat]):
                sub_item = QTreeWidgetItem(cat_item)
                sub_item.setText(0, sub['name'])
                sub_item.setData(0, Qt.ItemDataRole.UserRole, "sub")
                sub_item.setData(0, Qt.ItemDataRole.UserRole + 1, i) # Index in list
                
                if self.is_sub_incomplete(sub):
                    sub_item.setForeground(0, QColor("red"))
                
        self.tree.expandAll()

    def is_sub_incomplete(self, sub):
        # Check name
        name = sub.get('name', '')
        if not name or name == "New Sub":
            return True
        # Check ingredients (ignore tips as requested)
        ingredients = sub.get('ingredients')
        if not ingredients:
            return True
        
        # Check for invalid ingredients (references to non-existent ingredients)
        if self.all_ingredients:
            for ing in ingredients:
                if ing not in self.all_ingredients:
                    return True

        # Check image
        if not sub.get('image'):
            return True
        return False

    def refresh_avail_ingredients(self):
        self.avail_ings_list.clear()
        search = self.avail_ings_filter.text().lower()
        for name in sorted(self.all_ingredients.keys()):
            if search in name.lower():
                self.avail_ings_list.addItem(name)

    def refresh_ui(self):
        self.refresh_tree()
        self.refresh_avail_ingredients()
        
    def filter_avail_ings(self):
        self.refresh_avail_ingredients()
        
    def on_selection_changed(self, current, previous):
        if not current:
            self.form_group.setEnabled(False)
            self.form_group.setStyleSheet("")
            return
            
        item_type = current.data(0, Qt.ItemDataRole.UserRole)
        
        if item_type == "sub":
            self.form_group.setEnabled(True)
            cat_item = current.parent()
            self.current_category = cat_item.text(0)
            self.current_index = current.data(0, Qt.ItemDataRole.UserRole + 1)
            
            self.current_sub = self.subs[self.current_category][self.current_index]
            
            self.name_edit.setText(self.current_sub['name'])
            self.tip_edit.setText(self.current_sub['tip'])
            self.image_edit.setText(self.current_sub['image'])
            self.cat_combo.setCurrentText(self.current_category)
            
            self.current_ings_list.clear()
            for ing in self.current_sub['ingredients']:
                self.current_ings_list.addItem(ing)
                
            self.validate_fields()
        else:
            self.form_group.setEnabled(False)
            self.current_sub = None
            # Reset styles when deselecting
            self.name_edit.setStyleSheet("")
            self.image_edit.setStyleSheet("")
            self.current_ings_list.setStyleSheet("")

    def validate_fields(self):
        if not self.current_sub:
             return

        error_style = "border: 1px solid red;"
        default_style = ""
        
        # Validate Name
        name = self.name_edit.text().strip()
        if not name or name == "New Sub":
            self.name_edit.setStyleSheet(error_style)
        else:
            self.name_edit.setStyleSheet(default_style)
            
        # Validate Image
        image = self.image_edit.text().strip()
        if not image:
            self.image_edit.setStyleSheet(error_style)
        else:
            self.image_edit.setStyleSheet(default_style)
            
        # Validate Ingredients List (Empty check)
        if self.current_ings_list.count() == 0:
            self.current_ings_list.setStyleSheet(error_style)
        else:
            self.current_ings_list.setStyleSheet(default_style)
            
        # Validate Individual Ingredients (Existence check)
        for i in range(self.current_ings_list.count()):
            item = self.current_ings_list.item(i)
            ing_name = item.text()
            
            if ing_name not in self.all_ingredients:
                item.setForeground(QColor("#ff5555")) # Bright red for visibility
                item.setToolTip(f"'{ing_name}' not found in available ingredients!")
            else:
                item.setForeground(QColor("white"))
                item.setToolTip("")

    def browse_image(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Select Image", "", "Images (*.png *.jpg *.jpeg)")
        if file_path:
            filename = self.dm.import_image(file_path)
            if filename:
                # Store relative path expected by frontend (e.g., subs/Filename.png)
                # But frontend uses /images/ + sub.image.
                # sub definitions usually have "subs/Beach.png" or just "Ham.png"
                # Let's check sub_data.json: "subs/Pepe.png".
                # So we should prepend subs/ if it's a sub image? 
                # Or just put it in the root of images?
                # The existing structure has a subs/ folder inside images/.
                # My DataManager puts everything in images root.
                # Let's simple check if we want to organize into subs/ folder.
                # For now, let's just use the filename.
                self.image_edit.setText(filename)
                
    def add_category(self):
        # Using a dialog would be better but input dialog is quick
        from PyQt6.QtWidgets import QInputDialog
        name, ok = QInputDialog.getText(self, "New Category", "Category Name:")
        if ok and name:
            if name not in self.subs:
                self.subs[name] = []
                self.refresh_tree()
            else:
                QMessageBox.warning(self, "Error", "Category already exists")

    def add_sub(self):
        cat_item = self.tree.currentItem()
        target_cat = "Originals"
        if cat_item:
            if cat_item.data(0, Qt.ItemDataRole.UserRole) == "category":
                target_cat = cat_item.text(0)
            elif cat_item.parent():
                target_cat = cat_item.parent().text(0)
        
        if target_cat not in self.subs:
            # Fallback
            if self.subs:
                target_cat = list(self.subs.keys())[0]
            else:
                return # Should not happen if at least one category

        new_sub = {
            "name": "New Sub",
            "ingredients": [],
            "tip": "",
            "image": ""
        }
        self.subs[target_cat].append(new_sub)
        self.refresh_tree()
        
    def delete_item(self):
        item = self.tree.currentItem()
        if not item:
            return
            
        item_type = item.data(0, Qt.ItemDataRole.UserRole)
        name = item.text(0)
        
        confirm = QMessageBox.question(self, "Delete", f"Delete {name}?", QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if confirm != QMessageBox.StandardButton.Yes:
            return
            
        if item_type == "category":
            del self.subs[name]
        elif item_type == "sub":
            cat = item.parent().text(0)
            idx = item.data(0, Qt.ItemDataRole.UserRole + 1)
            del self.subs[cat][idx]
            
        self.refresh_tree()
        
    def add_ingredient_btn(self):
        item = self.avail_ings_list.currentItem()
        if item:
            self.current_ings_list.addItem(item.text())
            
    def add_ingredient_from_list(self, item):
        self.current_ings_list.addItem(item.text())
        
    def remove_ingredient(self):
        row = self.current_ings_list.currentRow()
        if row >= 0:
            self.current_ings_list.takeItem(row)
            
    def save_current(self):
        if not self.current_sub:
            return
            
        new_name = self.name_edit.text()
        new_cat = self.cat_combo.currentText()
        
        # Update details
        self.current_sub['name'] = new_name
        self.current_sub['tip'] = self.tip_edit.toPlainText()
        self.current_sub['image'] = self.image_edit.text()
        
        ingredients = []
        for i in range(self.current_ings_list.count()):
            ingredients.append(self.current_ings_list.item(i).text())
        self.current_sub['ingredients'] = ingredients
        
        # Handle Category Change
        if new_cat != self.current_category:
            # Remove from old
            self.subs[self.current_category].pop(self.current_index)
            # Add to new
            self.subs[new_cat].append(self.current_sub)
            
            # Refresh tree to reflect move
            self.refresh_tree()
        else:
            # Just update text in tree
            self.tree.currentItem().setText(0, new_name)
            
        if self.save_callback:
            self.save_callback()
            
        self.validate_fields()
        self.refresh_tree() # Refresh tree to update the red text in the list
        QMessageBox.information(self, "Saved", "Changes saved to disk!")


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Sub Trainer Editor")
        self.resize(1000, 700)
        
        self.dm = DataManager()
        self.subs, self.ingredients, self.tips, self.config = self.dm.load_data()
        
        # Main Layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        
        # Tabs
        self.tabs = QTabWidget()
        self.sub_editor = SubEditor(self.dm, self.save_data_silent)
        self.ing_editor = IngredientEditor(self.dm, self.save_data_silent)
        self.tips_editor = TipsEditor(self.dm, self.save_data_silent)
        
        self.tabs.addTab(self.sub_editor, "Subs & Wraps")
        self.tabs.addTab(self.ing_editor, "Ingredients")
        self.tabs.addTab(self.tips_editor, "Site Tips")
        self.tabs.currentChanged.connect(self.on_tab_changed)
        
        layout.addWidget(self.tabs)
        
        # Global Actions
        action_layout = QHBoxLayout()
        self.save_all_btn = QPushButton("Force Save All")
        self.save_all_btn.setStyleSheet("background-color: #2a82da; font-weight: bold; padding: 10px;")
        self.save_all_btn.clicked.connect(self.save_data)
        action_layout.addStretch()
        action_layout.addWidget(self.save_all_btn)
        
        layout.addLayout(action_layout)
        
        # Initial Load
        self.sub_editor.load_data(self.subs, self.ingredients)
        self.ing_editor.load_data(self.ingredients)
        self.tips_editor.load_data(self.tips, self.config)
        
    def on_tab_changed(self, index):
        # Refresh the current tab to ensure data consistency (especially shared ingredients)
        current_widget = self.tabs.widget(index)
        if current_widget == self.sub_editor:
            self.sub_editor.refresh_avail_ingredients()
            self.sub_editor.validate_fields()
            # We don't necessarily need to refresh tree unless subs changed elsewhere, 
            # but currently subs are only changed in SubEditor.
        elif current_widget == self.ing_editor:
            self.ing_editor.refresh_list()
        elif current_widget == self.tips_editor:
            self.tips_editor.refresh_list()

    def save_data_silent(self):
        try:
            self.dm.save_data(self.subs, self.ingredients, self.tips, self.config)
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to auto-save: {str(e)}")

    def save_data(self):
        try:
            self.dm.save_data(self.subs, self.ingredients, self.tips, self.config)
            QMessageBox.information(self, "Success", "Data saved successfully to public/ folder!")
        except Exception as e:
            QMessageBox.critical(self, "Error", f"Failed to save data: {str(e)}")

def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    app.setPalette(DarkPalette())
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
