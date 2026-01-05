#!/usr/bin/env python3
"""
Calculate total face amount from Zaid Shopeju's Writing Agent book of business.
52 policies total from Transamerica Life Access.
"""

# Face amounts from all 52 policies (Writing Agent role only)
face_amounts = [
    # Page 1 (50 policies)
    425000,    # MARIAMA DIALLO
    1000000,   # MOUSSA DIALLO
    1000000,   # OLUWAMUYIWA ONAMUTI (Initial Premium Not Paid)
    250000,    # ABDULAZEEZ N AKWUH
    1500000,   # AYODELE OKULAJA
    1000000,   # EKHUEMUENOGIEMWEN EKUNWE
    1000000,   # EKHUEMUENOGIEMWEN EKHUEMUENOGIEMWEN
    1000000,   # EKHUEMUENOGIEMWEN EKUNWE
    1000000,   # AANU OLAGUNDOYE
    300000,    # FOLASHADE OLAIYA
    1000000,   # AUGUSTINA ARMSTRONG OGBONNA
    250000,    # ELIZABETH BABARINDE
    250000,    # ELIZABETH BABARINDE
    250000,    # ADEKUNBI FASESIN
    250000,    # OLUWASEUN SHOMOYE
    500000,    # OGEMDI MADU
    250000,    # BOLAJI G OSOSANYA
    1000000,   # MOBOLANLE BABAYEMI
    1000000,   # ESTHER ROGO
    400000,    # OLUWAKEMISOLA OYEWANDE
    2000000,   # BUKONLA MUSA
    500000,    # HELEN LATIMORE (Free Look Surrender)
    1000000,   # OLATINWA AJAYI BOOKMAN (Free Look Surrender)
    250000,    # BEN WALKER
    150000,    # OMOLOLA GIWA
    150000,    # OMOLOLA GIWA
    150000,    # BUKOLA ALESHE
    150000,    # BUKOLA ALESHE
    1000000,   # TERENCE HAMILTON (Free Look Surrender)
    500000,    # TOLULOPE SALAM
    250000,    # OLATUNDE OYEWANDE
    100000,    # KENNETH CLARK
    150000,    # SHIELA NKRUMAH (Free Look Surrender)
    250000,    # OLAWALE SHOYOMBO
    100000,    # FRED CHUKWUEDO (Lapsed)
    250000,    # PAUL EISIRI
    100000,    # OLATUNDE OYEWANDE
    100000,    # OLATUNDE OYEWANDE
    500000,    # SUNDAY OZOREWOR
    350000,    # OLUWATOSIN ADETONA
    500000,    # OLATUNDE OYEWANDE (Free Look Surrender)
    150000,    # RAHMAT FOWORA
    700000,    # AWWAL O ABIDEKUN (Free Look Surrender)
    150000,    # RAHMAT FOWORA
    150000,    # AMINAT SHOPEJU
    150000,    # AMINAT SHOPEJU
    100000,    # MARGARET EREBA
    100000,    # EMMANUEL L EREBA
    1000000,   # ZAID SHOPEJU
    500000,    # OLUWASEYI ADEPITAN
    # Page 2 (2 policies)
    450000,    # FAITH GAITA (Surrendered)
    450000,    # MICHAEL M MUITA (Surrendered)
]

total = sum(face_amounts)
count = len(face_amounts)

print(f"Total Policies: {count}")
print(f"Total Face Amount: ${total:,}")
print(f"Average Face Amount: ${total/count:,.2f}")

# Format for display
if total >= 1000000000:
    display = f"${total/1000000000:.2f}B"
elif total >= 1000000:
    display = f"${total/1000000:.2f}M"
else:
    display = f"${total:,}"

print(f"Display Format: {display}")

# Save result to file
with open('/home/ubuntu/wfg-crm/data/total_face_amount.txt', 'w') as f:
    f.write(f"Total Face Amount: ${total:,}\n")
    f.write(f"Total Policies: {count}\n")
    f.write(f"Display Format: {display}\n")
    f.write(f"Raw Value: {total}\n")
