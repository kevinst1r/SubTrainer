import json
import os
import shutil

class DataManager:
    def __init__(self, base_path=None):
        if base_path is None:
            # Assume we are in editor/ and want to go to public/
            self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        else:
            self.base_dir = base_path
            
        self.public_dir = os.path.join(self.base_dir, 'public')
        self.sub_data_path = os.path.join(self.public_dir, 'sub_data.json')
        self.ingredient_data_path = os.path.join(self.public_dir, 'ingredient_data.json')
        self.tips_path = os.path.join(self.public_dir, 'site_tips.json')
        self.config_path = os.path.join(self.public_dir, 'sorting_config.json')
        self.images_dir = os.path.join(self.public_dir, 'images')

    def load_data(self):
        subs = {}
        ingredients = {}
        tips = []
        config = {
            "sort_mode": "category",
            "ingredient_image_size": 64,
            "ui_text_size": 20,
            "ingredient_text_size": 15,
            "tip_icon": "💡"
        }
        
        if os.path.exists(self.sub_data_path):
            try:
                with open(self.sub_data_path, 'r', encoding='utf-8') as f:
                    subs = json.load(f)
            except json.JSONDecodeError:
                subs = {}
                
        if os.path.exists(self.ingredient_data_path):
            try:
                with open(self.ingredient_data_path, 'r', encoding='utf-8') as f:
                    ingredients = json.load(f)
            except json.JSONDecodeError:
                ingredients = {}
                
        if os.path.exists(self.tips_path):
            try:
                with open(self.tips_path, 'r', encoding='utf-8') as f:
                    tips = json.load(f)
            except json.JSONDecodeError:
                tips = []
                
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    # Update default config with loaded values
                    config.update(json.load(f))
            except json.JSONDecodeError:
                pass # Use defaults
                
        return subs, ingredients, tips, config

    def save_data(self, subs, ingredients, tips, config):
        with open(self.sub_data_path, 'w', encoding='utf-8') as f:
            json.dump(subs, f, indent=2)
            
        with open(self.ingredient_data_path, 'w', encoding='utf-8') as f:
            json.dump(ingredients, f, indent=2)
            
        with open(self.tips_path, 'w', encoding='utf-8') as f:
            json.dump(tips, f, indent=2)
            
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)

    def import_image(self, source_path):
        if not source_path or not os.path.exists(source_path):
            return None
            
        filename = os.path.basename(source_path)
        dest_path = os.path.join(self.images_dir, filename)
        
        # If file exists, maybe rename or overwrite? For now, overwrite/use existing.
        if os.path.abspath(source_path) != os.path.abspath(dest_path):
            shutil.copy2(source_path, dest_path)
            
        return filename

    def get_ingredient_categories(self):
        # Could be dynamic, but let's stick to the known ones for now + allow custom?
        # The frontend defines: "All", "Wraps", "Meats", "Cheese", "Veggies", "Condiments", "LTO"
        return ["Wraps", "Meats", "Cheese", "Veggies", "Condiments", "LTO"]
