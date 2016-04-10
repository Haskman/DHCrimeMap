# -*- coding: utf-8 -*-
"""
Created on Sat Apr 09 17:52:49 2016

@author: Victor
"""

import pandas as pd
import json

data_address = "data/LMPD_OP_BIAS.csv"
data = pd.read_csv(data_address)


output = data.to_json(orient = "records")
print output

with open('data/Processed_Crime_Data.json', 'w') as outfile:
    json.dump(output, outfile)
