import csv
import json
import requests
import io

# ⚠️ On règlera le vrai lien du gouvernement à l'étape suivante !
# En attendant, je mets un lien vers un petit fichier de test pour que le robot ne plante pas.
URL_CSV = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/UID_ISO_FIPS_LookUp_Table.csv" # Lien temporaire pour tester la mécanique

def fetch_and_process_data():
    try:
        print("Téléchargement des données en cours...")
        # Étape 1 : On télécharge le fichier
        response = requests.get(URL_CSV)
        response.raise_for_status()
        
        # Étape 2 : On lit le CSV
        # On utilise io.StringIO pour que le texte soit lu comme un fichier
        csv_file = io.StringIO(response.text)
        reader = csv.DictReader(csv_file, delimiter=',') # À changer en ';' pour la France plus tard
        
        data_json = []
        for row in reader:
            # 💡 C'est ici qu'on fera correspondre les colonnes du gouvernement avec ta carte.
            # Pour l'instant, c'est une coquille vide en attendant le vrai fichier.
            pass

        # Étape 3 : On sauvegarde le résultat au format JSON
        with open('data.json', 'w', encoding='utf-8') as f:
            json.dump(data_json, f, ensure_ascii=False, indent=2)
            
        print("Succès ! Le fichier data.json a été mis à jour.")

    except Exception as e:
        print(f"Erreur lors de la mise à jour : {e}")

if __name__ == "__main__":
    fetch_and_process_data()
